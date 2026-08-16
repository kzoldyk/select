# Select ⚡

**Select** is a fast, lightweight, local-first MySQL and MariaDB desktop client built with **Tauri v2**, **Vue 3**, **TypeScript**, and **Rust**.

---

## Prerequisites

Before installing or building Select, ensure you have:

- **Node.js**: `v18+` (or `v20+` recommended)
- **Rust**: `v1.75+` (Install via `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)

---

## OS-Specific System Dependencies

### macOS
Install Xcode Command Line Tools:
```bash
xcode-select --install
```

### Linux (Ubuntu / Debian)
Install required Tauri v2 system packages:
```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

### Linux (Fedora)
```bash
sudo dnf check-update
sudo dnf groupinstall -y "C Development Tools and Libraries"
sudo dnf install -y webkit2gtk4.1-devel openssl-devel libayatana-appindicator-gtk3-devel librsvg2-devel
```

### Windows
- Install [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
- Ensure **WebView2** runtime is installed (included by default on Windows 10/11).

---

## Installation & Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/hitesh103/select.git
   cd select
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Run in development mode**:
   ```bash
   npm run tauri dev
   ```

---

## Building the Desktop App

### 1. Build for macOS (.dmg / .app)
```bash
npm run tauri build
```
Output bundles:
- `src-tauri/target/release/bundle/dmg/Select_x.x.x_x64.dmg` (or `_aarch64.dmg`)
- `src-tauri/target/release/bundle/macos/Select.app`

> **Note for macOS (Unsigned App / No Developer License):**
> Because this build is unsigned (no paid Apple Developer Certificate), macOS Gatekeeper will block it on first launch with a warning *"Select cannot be opened because the developer cannot be verified"*.
>
> **How to open on macOS:**
> - **Option 1 (Quickest)**: Right-click (or `Control` + Click) `Select.app` in Finder → Select **Open** → Click **Open** in the dialog.
> - **Option 2 (Terminal)**: Remove the quarantine flag:
>   ```bash
>   xattr -cr /Applications/Select.app
>   ```
> - **Option 3**: Open **System Settings** → **Privacy & Security** → Scroll down to Security and click **Open Anyway**.

---

### 2. Build for Linux (.deb / .AppImage)
```bash
npm run tauri build
```
Output bundles:
- `src-tauri/target/release/bundle/deb/`
- `src-tauri/target/release/bundle/appimage/`

Run the AppImage:
```bash
chmod +x Select_x.x.x_amd64.AppImage
./Select_x.x.x_amd64.AppImage
```

---

### 3. Build for Windows (.msi / .exe installer)
```powershell
npm run tauri build
```
Output bundles:
- `src-tauri/target/release/bundle/msi/Select_x.x.x_x64_en-US.msi`
- `src-tauri/target/release/bundle/nsis/Select_x.x.x_x64-setup.exe`

---

## Testing

```bash
# Run frontend unit tests (Vitest)
npm test

# Run Rust backend test suite
cargo test --manifest-path src-tauri/Cargo.toml
```

---

## Key Features

- **⚡ Blazing Fast Architecture**: Native Rust backend with `tokio` and `mysql_async` connection pooling.
- **🗃️ Unified Data Grid**: Row virtualization, in-place cell editing, dirty-state batching, cross-schema resolution, and TSV/CSV copy.
- **🔍 Large Value Inspector**: Contextual drawer for formatting, editing, and copying large JSON & TEXT fields.
- **🛡️ Production Safety**: Connection-level read-only mode, environment badges (`PROD`, `STAGING`, `LOCAL`), and mutation safeguards.
- **📊 Schema Visualizer**: Interactive ER diagram canvas showing foreign keys, indices, and constraints.
- **📝 CodeMirror 6 Editor**: SQL auto-completion, multi-statement execution tabs, and `EXPLAIN` plan tree viewer.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
