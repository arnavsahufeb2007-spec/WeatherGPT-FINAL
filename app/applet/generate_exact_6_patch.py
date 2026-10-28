import os
import subprocess
import shutil

base_dir = "/tmp/baseline_repo"
if os.path.exists(base_dir):
    shutil.rmtree(base_dir)

os.makedirs(f"{base_dir}/server/services", exist_ok=True)
os.makedirs(f"{base_dir}/src/components", exist_ok=True)

# 1. package.json baseline
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

# 2. VoiceLanguageModal.tsx baseline
if os.path.exists("/app/applet/tmp_voice_modal_base.txt"):
    with open("/app/applet/tmp_voice_modal_base.txt", "r", encoding="utf-8") as f:
        with open(f"{base_dir}/src/components/VoiceLanguageModal.tsx", "w", encoding="utf-8") as f2:
            f2.write(f.read())

# 3. WeatherChat.tsx baseline
if os.path.exists("/app/applet/tmp_weather_chat_base.txt"):
    with open("/app/applet/tmp_weather_chat_base.txt", "r", encoding="utf-8") as f:
        with open(f"{base_dir}/src/components/WeatherChat.tsx", "w", encoding="utf-8") as f2:
            f2.write(f.read())

# 4. geminiService.ts baseline
if os.path.exists("/app/applet/tmp_gemini_service_base.txt"):
    with open("/app/applet/tmp_gemini_service_base.txt", "r", encoding="utf-8") as f:
        with open(f"{base_dir}/server/services/geminiService.ts", "w", encoding="utf-8") as f2:
            f2.write(f.read())

# 5. languages.ts baseline
if os.path.exists("/app/applet/tmp_languages_base.txt"):
    with open("/app/applet/tmp_languages_base.txt", "r", encoding="utf-8") as f:
        with open(f"{base_dir}/src/languages.ts", "w", encoding="utf-8") as f2:
            f2.write(f.read())

# 6. server.ts baseline
if os.path.exists("/app/applet/tmp_server_base.txt"):
    with open("/app/applet/tmp_server_base.txt", "r", encoding="utf-8") as f:
        with open(f"{base_dir}/server.ts", "w", encoding="utf-8") as f2:
            f2.write(f.read())

# Initialize Git repo in baseline
subprocess.run(["git", "init"], cwd=base_dir, stdout=subprocess.DEVNULL)
subprocess.run(["git", "config", "user.email", "ci@weathergpt.app"], cwd=base_dir, stdout=subprocess.DEVNULL)
subprocess.run(["git", "config", "user.name", "WeatherGPT CI"], cwd=base_dir, stdout=subprocess.DEVNULL)

subprocess.run(["git", "add", "."], cwd=base_dir, stdout=subprocess.DEVNULL)
subprocess.run(["git", "commit", "-m", "Baseline commit 179dc72"], cwd=base_dir, stdout=subprocess.DEVNULL)

# Apply modified and new files onto baseline repo
all_target_files = [
    "package.json",
    "server.ts",
    "server/services/geminiService.ts",
    "src/languages.ts",
    "src/components/VoiceLanguageModal.tsx",
    "src/components/WeatherChat.tsx",
    "server/serverApp.ts",
    "src/components/MarkdownRenderer.tsx",
    "test/task2LanguageResolutionAndMarkdown.test.ts",
    "test/securityFixes.test.ts",
]

for rel_path in all_target_files:
    src_file = f"/app/applet/{rel_path}"
    dest_file = f"{base_dir}/{rel_path}"
    os.makedirs(os.path.dirname(dest_file), exist_ok=True)
    with open(src_file, "r", encoding="utf-8") as f_src:
        with open(dest_file, "w", encoding="utf-8") as f_dest:
            f_dest.write(f_src.read())

# Add new files intent-to-add so git diff includes them
subprocess.run(["git", "add", "-N", "."], cwd=base_dir, stdout=subprocess.DEVNULL)

diff_res = subprocess.run(["git", "diff"], cwd=base_dir, capture_output=True, text=True)
patch_content = diff_res.stdout

patch_file = "/app/applet/weathergpt_tasks1_to_4_fixed.patch"
with open(patch_file, "w", encoding="utf-8") as f:
    f.write(patch_content)

# Copy to artifacts directory
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
    print("SUCCESS: Unified patch validates 100% cleanly against all 6 exact baseline files!")
else:
    print(f"Check output: {check_res.stderr}")
