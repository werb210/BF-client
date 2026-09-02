#!/usr/bin/env python3
"""Text-only release guardrails for the canonical Capacitor iOS project."""

from pathlib import Path
import re


project_path = Path("client-app/ios/App/App.xcodeproj/project.pbxproj")
if not project_path.is_file():
    raise SystemExit(f"Missing canonical Xcode project: {project_path}")

project = project_path.read_text(encoding="utf-8")

# Resolve the App target's configuration list instead of accepting matching
# settings from an unrelated target or the project-level configurations.
target_match = re.search(
    r"PBXNativeTarget.*?buildConfigurationList = ([A-F0-9]+).*?name = App;.*?End PBXNativeTarget",
    project,
    re.DOTALL,
)
if not target_match:
    raise SystemExit("Could not locate the App target configuration list")

config_list_id = target_match.group(1)
list_match = re.search(
    rf"^\s*{config_list_id} /\*.*?\*/ = \{{.*?buildConfigurations = \((.*?)\);.*?^\s*\}};",
    project,
    re.DOTALL | re.MULTILINE,
)
if not list_match:
    raise SystemExit("Could not read the App target configurations")

config_ids = re.findall(r"([A-F0-9]+) /\* (Debug|Release) \*/", list_match.group(1))
configs = {name: config_id for config_id, name in config_ids}
for name in ("Debug", "Release"):
    config_id = configs.get(name)
    if not config_id:
        raise SystemExit(f"App target is missing its {name} configuration")
    block_match = re.search(
        rf"^\s*{config_id} /\*.*?\*/ = \{{(.*?)\n\s*name = {name};\n\s*\}};",
        project,
        re.DOTALL | re.MULTILINE,
    )
    if not block_match:
        raise SystemExit(f"Could not read App target {name} settings")
    settings = block_match.group(1)
    if not re.search(r"PRODUCT_BUNDLE_IDENTIFIER\s*=\s*com\.boreal\.client\s*;", settings):
        raise SystemExit(f"App target {name} bundle ID must be com.boreal.client")
    if not re.search(r'TARGETED_DEVICE_FAMILY\s*=\s*"1\s*,\s*2"\s*;', settings):
        raise SystemExit(f"App target {name} must support iPhone and iPad (1,2)")

if not re.search(r"PrivacyInfo\.xcprivacy\s+in Resources", project):
    raise SystemExit("PrivacyInfo.xcprivacy is not included in App resources")

for config_path in Path("client-app").glob("capacitor.config.*"):
    source = config_path.read_text(encoding="utf-8")
    source = re.sub(r"/\*.*?\*/", "", source, flags=re.DOTALL)
    source = re.sub(r"//[^\n]*", "", source)
    if re.search(r"allowMixedContent\s*:\s*true\b", source):
        raise SystemExit(f"Insecure allowMixedContent=true in {config_path}")

print("iOS release guardrails passed")
