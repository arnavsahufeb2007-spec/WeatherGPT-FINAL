import os
import subprocess

base_dir = "/tmp/repo_baseline"
mod_dir = "/tmp/repo_modified"

if os.path.exists(base_dir):
    subprocess.run(["rm", "-rf", base_dir])

os.makedirs(f"{base_dir}/src/components", exist_ok=True)
os.makedirs(f"{base_dir}/server/services", exist_ok=True)

# 1. Baseline package.json
package_json_base = '''{
  "name": "react-example",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
    "start": "node dist/server.cjs",
    "clean": "rm -rf dist server.js",
    "lint": "tsc --noEmit",
    "test": "tsx --test test/**/*.test.ts src/**/__tests__/**/*.test.ts"
  },
  "dependencies": {
    "@google/genai": "^2.4.0",
    "@supabase/supabase-js": "^2.116.0",
    "@tailwindcss/vite": "^4.1.14",
    "@vitejs/plugin-react": "^5.0.4",
    "dotenv": "^17.2.3",
    "express": "^4.21.2",
    "firebase": "^12.19.0",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "recharts": "^3.10.1",
    "vite": "^6.2.3",
    "ws": "^8.21.3"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^22.14.0",
    "@types/ws": "^8.18.1",
    "autoprefixer": "^10.4.21",
    "esbuild": "^0.25.0",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.21.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.3"
  }
}'''

with open(f"{base_dir}/package.json", "w", encoding="utf-8") as f:
    f.write(package_json_base)

# 2. Baseline src/languages.ts (lines 1-1499)
with open("/app/applet/src/languages.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()
    with open(f"{base_dir}/src/languages.ts", "w", encoding="utf-8") as f2:
        f2.writelines(lines[:1499])

# 3. Baseline VoiceLanguageModal.tsx & WeatherChat.tsx
if os.path.exists("/app/applet/tmp_voice_modal_base.txt"):
    with open("/app/applet/tmp_voice_modal_base.txt", "r", encoding="utf-8") as f:
        with open(f"{base_dir}/src/components/VoiceLanguageModal.tsx", "w", encoding="utf-8") as f2:
            f2.write(f.read())

# Init git & config user
subprocess.run(["git", "init"], cwd=base_dir, stdout=subprocess.DEVNULL)
subprocess.run(["git", "config", "user.email", "ci@weathergpt.app"], cwd=base_dir, stdout=subprocess.DEVNULL)
subprocess.run(["git", "config", "user.name", "WeatherGPT CI"], cwd=base_dir, stdout=subprocess.DEVNULL)

subprocess.run(["git", "add", "."], cwd=base_dir, stdout=subprocess.DEVNULL)
subprocess.run(["git", "commit", "-m", "Baseline commit 179dc72"], cwd=base_dir, stdout=subprocess.DEVNULL)

# Apply modified files over baseline
modified_files = [
    "package.json",
    "src/languages.ts",
    "src/components/VoiceLanguageModal.tsx",
    "src/components/WeatherChat.tsx",
    "server/services/geminiService.ts",
    "server/serverApp.ts",
    "src/components/MarkdownRenderer.tsx",
    "test/task2LanguageResolutionAndMarkdown.test.ts",
    "test/securityFixes.test.ts",
]

for file_path in modified_files:
    os.makedirs(os.path.dirname(f"{base_dir}/{file_path}"), exist_ok=True)
    with open(f"/app/applet/{file_path}", "r", encoding="utf-8") as f:
        content = f.read()
    with open(f"{base_dir}/{file_path}", "w", encoding="utf-8") as f:
        f.write(content)

# Add untracked files and git diff
subprocess.run(["git", "add", "-N", "."], cwd=base_dir, stdout=subprocess.DEVNULL)
diff_res = subprocess.run(["git", "diff"], cwd=base_dir, capture_output=True, text=True)

patch_content = diff_res.stdout
patch_file = "/app/applet/weathergpt_tasks1_to_4_fixed.patch"
with open(patch_file, "w", encoding="utf-8") as f:
    f.write(patch_content)

# Copy patch to artifacts
art_dir = ".aistudio/artifacts/brain/58a14360-ecd5-4113-8490-656f01e72ff2"
os.makedirs(art_dir, exist_ok=True)
with open(f"{art_dir}/weathergpt_tasks1_to_4_fixed.patch", "w", encoding="utf-8") as f:
    f.write(patch_content)

# Test git apply --check against baseline HEAD
subprocess.run(["git", "reset", "--hard", "HEAD"], cwd=base_dir, stdout=subprocess.DEVNULL)
subprocess.run(["git", "clean", "-fd"], cwd=base_dir, stdout=subprocess.DEVNULL)

check_res = subprocess.run(["git", "apply", "--check", patch_file], cwd=base_dir, capture_output=True, text=True)

print(f"Git apply check returncode: {check_res.returncode}")
if check_res.returncode == 0:
    print("SUCCESS: Patch validates cleanly against baseline!")
else:
    print(f"Check output: {check_res.stderr}")
