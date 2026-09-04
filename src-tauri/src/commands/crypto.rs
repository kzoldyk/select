use aes_gcm::{aead::Aead, AeadCore, Aes256Gcm, Key, KeyInit, Nonce};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use keyring::Entry;
use rand::{rngs::OsRng, RngCore};
use serde_json::Value;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const ENCRYPTED_PASSWORD_PREFIX: &str = "enc:v1:";
const KEYCHAIN_SERVICE: &str = "com.hiteshbhaiprajapati.select";
const KEYCHAIN_USER: &str = "sql-encryption-key";

pub fn password_looks_encrypted(password: &str) -> bool {
    password.starts_with(ENCRYPTED_PASSWORD_PREFIX)
        || (password.len() > 40 && password.chars().all(|c| c.is_ascii_alphanumeric() || c == '+' || c == '/' || c == '='))
}

fn encryption_key_paths(app: &AppHandle) -> Result<Vec<PathBuf>, String> {
    let base = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&base).map_err(|e| e.to_string())?;
    let mut legacy = base.clone();
    legacy.push(".select-key");
    let mut current = base;
    current.push(".encryption_key");
    Ok(vec![current, legacy])
}

fn keychain_entry() -> Result<Entry, String> {
    Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER).map_err(|e| format!("Keychain unavailable: {e}"))
}

fn read_key_from_keychain() -> Result<Option<Vec<u8>>, String> {
    let entry = keychain_entry()?;
    match entry.get_password() {
        Ok(b64) => BASE64
            .decode(b64)
            .map(Some)
            .map_err(|e| format!("Corrupted keychain key: {e}")),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Keychain read failed: {e}")),
    }
}

fn write_key_to_keychain(key: &[u8]) -> Result<(), String> {
    let entry = keychain_entry()?;
    entry
        .set_password(&BASE64.encode(key))
        .map_err(|e| format!("Keychain write failed: {e}"))
}

fn read_key_from_files(paths: &[PathBuf]) -> Option<Vec<u8>> {
    read_all_keys_from_files(paths).into_iter().next()
}

/// Every distinct 32-byte key found in the local key files (current +
/// legacy paths). During the unstable period the keychain and the file keys
/// may have diverged, so decryption must be able to try all of them.
fn read_all_keys_from_files(paths: &[PathBuf]) -> Vec<Vec<u8>> {
    let mut out = Vec::new();
    for path in paths {
        if let Ok(content) = std::fs::read(path) {
            if content.len() == 32 && !out.contains(&content) {
                out.push(content);
            }
        }
    }
    out
}

/// Keeps an offline copy of the active key so decryption stays stable even
/// when the OS keychain becomes unavailable (e.g. after a rebuild of an
/// ad-hoc-signed binary, or a locked keychain). The file bytes ARE the key.
fn ensure_local_key_copy(paths: &[PathBuf], key: &[u8]) {
    if read_key_from_files(paths).is_none() {
        let _ = std::fs::write(&paths[0], key);
    }
}

fn create_and_persist_key(paths: &[PathBuf]) -> Result<Vec<u8>, String> {
    let mut key = vec![0u8; 32];
    OsRng.fill_bytes(&mut key);
    // Write the local copy FIRST so this key is always recoverable, then
    // mirror it into the keychain on a best-effort basis.
    std::fs::write(&paths[0], &key).map_err(|e| e.to_string())?;
    let _ = write_key_to_keychain(&key);
    Ok(key)
}

/// Resolves the AES-256 key. The invariant that matters most is STABILITY:
/// once a key exists it must never silently rotate, otherwise every sealed
/// password becomes undecryptable garbage. Preference order:
/// 1. OS keychain (macOS Keychain / Windows Credential Manager / libsecret)
///    — with a persistent local copy kept in sync for recovery
/// 2. Local file key — adopted (and mirrored into the keychain when possible)
/// 3. Fresh random key — local copy first, keychain best-effort
///
/// When the keychain read FAILS (denied/locked), we deliberately do NOT touch
/// the keychain and fall back to the local copy; rotating the key here would
/// orphan every previously sealed password.
fn get_or_create_encryption_key(app: &AppHandle) -> Result<Vec<u8>, String> {
    let paths = encryption_key_paths(app)?;

    match read_key_from_keychain() {
        Ok(Some(key)) => {
            ensure_local_key_copy(&paths, &key);
            Ok(key)
        }
        Ok(None) => {
            // No keychain entry yet: adopt any existing local key, else create one.
            if let Some(key) = read_key_from_files(&paths) {
                let _ = write_key_to_keychain(&key);
                Ok(key)
            } else {
                create_and_persist_key(&paths)
            }
        }
        Err(_) => {
            // Keychain present but unusable — use the stable local copy.
            if let Some(key) = read_key_from_files(&paths) {
                Ok(key)
            } else {
                create_and_persist_key(&paths)
            }
        }
    }
}

fn encrypt_with_key(key_bytes: &[u8], plaintext: &str) -> Result<String, String> {
    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce_bytes = Aes256Gcm::generate_nonce(&mut OsRng);
    let ciphertext = cipher
        .encrypt(&nonce_bytes, plaintext.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;
    let mut combined = nonce_bytes.to_vec();
    combined.extend_from_slice(&ciphertext);
    Ok(BASE64.encode(&combined))
}

fn decrypt_with_key(key_bytes: &[u8], ciphertext_b64: &str) -> Result<String, String> {
    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);
    let combined = BASE64
        .decode(ciphertext_b64)
        .map_err(|e| format!("Invalid base64: {}", e))?;
    if combined.len() < 12 {
        return Err("Invalid ciphertext".into());
    }
    let (nonce_bytes, ct) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    let plaintext = cipher
        .decrypt(nonce, ct)
        .map_err(|e| format!("Decryption failed: {}", e))?;
    String::from_utf8(plaintext).map_err(|e| format!("Invalid UTF-8: {}", e))
}

/// All AES keys that stored data might have been sealed with: the primary
/// (current) key first, then any divergent legacy local keys. Trying each
/// lets passwords sealed before a key mix-up recover automatically; the next
/// save re-seals them with the primary key, healing them permanently.
fn collect_candidate_keys(app: &AppHandle, primary: Vec<u8>) -> Result<Vec<Vec<u8>>, String> {
    let mut keys = vec![primary];
    let paths = encryption_key_paths(app)?;
    for key in read_all_keys_from_files(&paths) {
        if !keys.contains(&key) {
            keys.push(key);
        }
    }
    Ok(keys)
}

fn decrypt_stored_password(keys: &[Vec<u8>], stored: &str) -> Result<String, String> {
    if stored.is_empty() {
        return Ok(String::new());
    }
    if let Some(payload) = stored.strip_prefix(ENCRYPTED_PASSWORD_PREFIX) {
        let mut last_err = String::from("no key");
        for key in keys {
            match decrypt_with_key(key, payload) {
                Ok(plain) => return Ok(plain),
                Err(e) => last_err = e,
            }
        }
        return Err(last_err);
    }
    // Legacy bare-ciphertext heuristic: only trust it if it actually decrypts.
    // A real plaintext password that merely looks like base64 must pass
    // through untouched rather than fail (it would corrupt the connection).
    if password_looks_encrypted(stored) {
        for key in keys {
            if let Ok(plain) = decrypt_with_key(key, stored) {
                return Ok(plain);
            }
        }
    }
    Ok(stored.to_string())
}

#[tauri::command]
pub async fn seal_connections_for_storage(
    app: AppHandle,
    connections: Value,
) -> Result<Value, String> {
    let key_bytes = get_or_create_encryption_key(&app)?;
    let arr = connections
        .as_array()
        .ok_or_else(|| "connections must be an array".to_string())?;

    let mut sealed = Vec::with_capacity(arr.len());
    for conn in arr {
        let mut entry = conn.clone();
        if let Some(obj) = entry.as_object_mut() {
            if let Some(Value::String(password)) = obj.get("password") {
                if !password.is_empty() && !password_looks_encrypted(password) {
                    let enc = encrypt_with_key(&key_bytes, password)?;
                    obj.insert(
                        "password".into(),
                        Value::String(format!("{ENCRYPTED_PASSWORD_PREFIX}{enc}")),
                    );
                }
            }
        }
        sealed.push(entry);
    }
    Ok(Value::Array(sealed))
}

#[derive(serde::Serialize)]
pub struct UnsealedConnections {
    pub connections: Vec<Value>,
    /// Names of connections whose sealed password could not be decrypted
    /// (e.g. key rotated before this fix). Their stored value is left
    /// untouched so nothing is silently corrupted; the UI asks the user to
    /// re-enter those passwords.
    pub degraded: Vec<String>,
}

#[tauri::command]
pub async fn unseal_connections_from_storage(
    app: AppHandle,
    connections: Value,
) -> Result<UnsealedConnections, String> {
    let primary_key = get_or_create_encryption_key(&app)?;
    let keys = collect_candidate_keys(&app, primary_key)?;
    let arr = connections
        .as_array()
        .ok_or_else(|| "connections must be an array".to_string())?;

    let mut restored = Vec::with_capacity(arr.len());
    let mut degraded = Vec::new();
    for conn in arr {
        let mut entry = conn.clone();
        if let Some(obj) = entry.as_object_mut() {
            if let Some(Value::String(password)) = obj.get("password") {
                if password_looks_encrypted(password) {
                    match decrypt_stored_password(&keys, password) {
                        Ok(plain) => {
                            obj.insert("password".into(), Value::String(plain));
                        }
                        Err(e) => {
                            let name = obj
                                .get("name")
                                .and_then(|v| v.as_str())
                                .unwrap_or("Unnamed connection")
                                .to_string();
                            eprintln!("unseal: cannot decrypt password for '{name}': {e}");
                            degraded.push(name);
                            // Leave the stored value as-is; do NOT fail the
                            // whole batch over one bad entry. Only prefixed
                            // values reach this arm — bare-base64 plaintext
                            // passes through untouched.
                        }
                    }
                }
            }
        }
        restored.push(entry);
    }
    Ok(UnsealedConnections {
        connections: restored,
        degraded,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn password_encryption_roundtrip() {
        let key = vec![0u8; 32];
        let enc = encrypt_with_key(&key, "secret-pass").unwrap();
        let dec = decrypt_with_key(&key, &enc).unwrap();
        assert_eq!(dec, "secret-pass");
    }

    #[test]
    fn prefixed_password_roundtrip() {
        let key = vec![1u8; 32];
        let enc = encrypt_with_key(&key, "db-password").unwrap();
        let stored = format!("{ENCRYPTED_PASSWORD_PREFIX}{enc}");
        assert!(password_looks_encrypted(&stored));
        let dec = decrypt_stored_password(&[key], &stored).unwrap();
        assert_eq!(dec, "db-password");
    }

    #[test]
    fn long_alnum_plaintext_passes_through() {
        // A real password that merely looks like base64 must NOT be treated
        // as ciphertext when it fails to decrypt.
        let key = vec![2u8; 32];
        let plain = "Abcdefghijklmnopqrstuvwxyz0123456789+/abcdefghij";
        assert!(password_looks_encrypted(plain));
        let out = decrypt_stored_password(&[key], plain).unwrap();
        assert_eq!(out, plain);
    }

    #[test]
    fn prefixed_password_with_wrong_key_is_an_error() {
        let enc = encrypt_with_key(&vec![3u8; 32], "real-secret").unwrap();
        let stored = format!("{ENCRYPTED_PASSWORD_PREFIX}{enc}");
        let wrong_key = vec![4u8; 32];
        assert!(decrypt_stored_password(&[wrong_key], &stored).is_err());
    }

    #[test]
    fn recovers_when_a_candidate_key_matches() {
        // Password sealed with an old divergent key while the primary differs.
        let old_key = vec![5u8; 32];
        let enc = encrypt_with_key(&old_key, "legacy-secret").unwrap();
        let stored = format!("{ENCRYPTED_PASSWORD_PREFIX}{enc}");
        let keys = vec![vec![6u8; 32], old_key.clone()];
        let dec = decrypt_stored_password(&keys, &stored).unwrap();
        assert_eq!(dec, "legacy-secret");
    }
}
