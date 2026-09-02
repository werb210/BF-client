#!/usr/bin/env python3
"""Text-only release guardrails for the canonical Capacitor iOS project."""

from pathlib import Path
import re


project_path = Path("client-app/ios/App/App.xcodeproj/project.pbxproj")
if not project_path.is_file():
    raise SystemExit(f"Missing canonical Xcode project: {project_path}")

project = project_path.read_text(encoding="utf-8")


def object_body(object_id: str, label: str) -> str:
    """Return one PBX object's body without depending on its generated ID."""
    match = re.search(
        rf"^[ \t]*{re.escape(object_id)} /\*[^\n]*?\*/ = \{{(.*?)^[ \t]*\}};",
        project,
        re.DOTALL | re.MULTILINE,
    )
    if not match:
        raise SystemExit(f"Could not read {label}")
    return match.group(1)


# Resolve the App target so every relationship below is checked on that target,
# rather than accepting matching objects belonging to another target.
target_match = re.search(
    r"^\s*([A-F0-9]+) /\* App \*/ = \{\s*\n\s*isa = PBXNativeTarget;(.*?)^\s*\};",
    project,
    re.DOTALL | re.MULTILINE,
)
if not target_match:
    raise SystemExit("Could not locate the App target")
target = target_match.group(2)

config_list_match = re.search(r"buildConfigurationList = ([A-F0-9]+)", target)
if not config_list_match:
    raise SystemExit("Could not locate the App target configuration list")
config_list = object_body(config_list_match.group(1), "App target configurations")
config_ids = re.findall(r"([A-F0-9]+) /\* (Debug|Release) \*/", config_list)
configs = {name: config_id for config_id, name in config_ids}

for name in ("Debug", "Release"):
    config_id = configs.get(name)
    if not config_id:
        raise SystemExit(f"App target is missing its {name} configuration")
    settings = object_body(config_id, f"App target {name} settings")
    required_settings = {
        "bundle ID": r"PRODUCT_BUNDLE_IDENTIFIER\s*=\s*com\.boreal\.client\s*;",
        "iPhone and iPad device family (1,2)": r'TARGETED_DEVICE_FAMILY\s*=\s*"1\s*,\s*2"\s*;',
        "iPhone OS SDK": r"SDKROOT\s*=\s*iphoneos\s*;",
        "Mac Catalyst disabled": r"SUPPORTS_MACCATALYST\s*=\s*NO\s*;",
    }
    for description, pattern in required_settings.items():
        if not re.search(pattern, settings):
            raise SystemExit(f"App target {name} must have {description}")

    platforms_match = re.search(r'SUPPORTED_PLATFORMS\s*=\s*"?([^";]+)"?\s*;', settings)
    platforms = set(platforms_match.group(1).split()) if platforms_match else set()
    if not {"iphoneos", "iphonesimulator"}.issubset(platforms):
        raise SystemExit(
            f"App target {name} SUPPORTED_PLATFORMS must contain iphoneos and iphonesimulator"
        )

# Verify the package reference, product dependency, target membership, and link
# build file as separate parts of the complete CapApp-SPM relationship.
package_match = re.search(
    r"([A-F0-9]+) /\* XCLocalSwiftPackageReference \"CapApp-SPM\" \*/ = \{"
    r"\s*isa = XCLocalSwiftPackageReference;\s*relativePath = \"?CapApp-SPM\"?;",
    project,
)
if not package_match:
    raise SystemExit("Missing XCLocalSwiftPackageReference for CapApp-SPM")

product_match = re.search(
    r"([A-F0-9]+) /\* CapApp-SPM \*/ = \{\s*isa = XCSwiftPackageProductDependency;"
    rf"\s*package = {package_match.group(1)} .*?;\s*productName = \"?CapApp-SPM\"?;",
    project,
)
if not product_match:
    raise SystemExit("Missing XCSwiftPackageProductDependency for CapApp-SPM")
product_id = product_match.group(1)

product_dependencies = re.search(r"packageProductDependencies = \((.*?)\);", target, re.DOTALL)
if not product_dependencies or not re.search(
    rf"\b{product_id}\b /\* CapApp-SPM \*/", product_dependencies.group(1)
):
    raise SystemExit("App target packageProductDependencies does not include CapApp-SPM")

phase_ids_match = re.search(r"buildPhases = \((.*?)\);", target, re.DOTALL)
phase_ids = (
    re.findall(r"([A-F0-9]+) /\* Frameworks \*/", phase_ids_match.group(1))
    if phase_ids_match
    else []
)
linked = False
for phase_id in phase_ids:
    phase = object_body(phase_id, "App Frameworks build phase")
    build_file_ids = re.findall(r"([A-F0-9]+) /\* CapApp-SPM in Frameworks \*/", phase)
    for build_file_id in build_file_ids:
        build_file = object_body(build_file_id, "CapApp-SPM Frameworks build file")
        if re.search(rf"productRef = {product_id}\b", build_file):
            linked = True
if not linked:
    raise SystemExit("App Frameworks build phase does not link CapApp-SPM")

# Guard the canonical Capacitor resource layout produced by `cap sync ios`.
resource_phase_ids = (
    re.findall(r"([A-F0-9]+) /\* Resources \*/", phase_ids_match.group(1))
    if phase_ids_match
    else []
)
if not resource_phase_ids:
    raise SystemExit("App target is missing its Resources build phase")
resources = "\n".join(
    object_body(phase_id, "App Resources build phase")
    for phase_id in resource_phase_ids
)
for resource in (
    "PrivacyInfo.xcprivacy",
    "Assets.xcassets",
    "public",
    "capacitor.config.json",
    "config.xml",
):
    if not re.search(rf"/\* {re.escape(resource)} in Resources \*/", resources):
        raise SystemExit(f"{resource} is not included in App resources")

for required_path in (
    Path("client-app/ios/App/App/PrivacyInfo.xcprivacy"),
    Path("client-app/ios/App/App/Assets.xcassets"),
    Path("client-app/ios/App/App/public"),
    Path("client-app/ios/App/App/capacitor.config.json"),
    Path("client-app/ios/App/CapApp-SPM/Package.swift"),
):
    if not required_path.exists():
        raise SystemExit(f"Missing post-sync iOS artifact: {required_path}")

config_paths = sorted(Path("client-app").glob("capacitor.config.*"))
if not config_paths:
    raise SystemExit("Missing client-app/capacitor.config.*")
for config_path in config_paths:
    source = config_path.read_text(encoding="utf-8")
    source = re.sub(r"/\*.*?\*/", "", source, flags=re.DOTALL)
    source = re.sub(r"//[^\n]*", "", source)
    if not re.search(r"appId\s*:\s*['\"]com\.boreal\.client['\"]", source):
        raise SystemExit(f"Capacitor appId must be com.boreal.client in {config_path}")
    if re.search(r"allowMixedContent\s*:\s*true\b", source):
        raise SystemExit(f"Insecure allowMixedContent=true in {config_path}")

print("iOS release guardrails passed")
