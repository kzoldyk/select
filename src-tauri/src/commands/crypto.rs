use aes_gcm::{aead::Aead, AeadCore, Aes256Gcm, Key, KeyInit, Nonce};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::{rngs::OsRng, RngCore};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const ENCRYPTED_PASSWORD_PREFIX: &str = "enc:v1:";

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

fn get_or_create_encryption_key(app: &AppHandle) -> Result<Vec<u8>, String> {
    let paths = encryption_key_paths(app)?;
    for path in &paths {
        if path.exists() {
            let content = std::fs::read(path).map_err(|e| e.to_string())?;
            if content.len() == 32 {
                return Ok(content);
            }
        }
    }
    let path = &paths[0];
    let mut key = vec![0u8; 32];
    OsRng.fill_bytes(&mut key);
    let hash = Sha256::digest(&key);
    let obfuscated = hash.as_slice().to_vec();
    std::fs::write(&path, &obfuscated).map_err(|e| e.to_string())?;
    Ok(obfuscated)
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

fn decrypt_stored_password(key_bytes: &[u8], stored: &str) -> Result<String, String> {
    if stored.is_empty() {
        return Ok(String::new());
    }
    if let Some(payload) = stored.strip_prefix(ENCRYPTED_PASSWORD_PREFIX) {
        return decrypt_with_key(key_bytes, payload);
    }
    if password_looks_encrypted(stored) {
        return decrypt_with_key(key_bytes, stored);
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

#[tauri::command]
pub async fn unseal_connections_from_storage(
    app: AppHandle,
    connections: Value,
) -> Result<Value, String> {
    let key_bytes = get_or_create_encryption_key(&app)?;
    let arr = connections
        .as_array()
        .ok_or_else(|| "connections must be an array".to_string())?;

    let mut restored = Vec::with_capacity(arr.len());
    for conn in arr {
        let mut entry = conn.clone();
        if let Some(obj) = entry.as_object_mut() {
            if let Some(Value::String(password)) = obj.get("password") {
                if password_looks_encrypted(password) {
                    let plain = decrypt_stored_password(&key_bytes, password)?;
                    obj.insert("password".into(), Value::String(plain));
                }
            }
        }
        restored.push(entry);
    }
    Ok(Value::Array(restored))
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
        let dec = decrypt_stored_password(&key, &stored).unwrap();
        assert_eq!(dec, "db-password");
    }
}
