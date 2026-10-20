from pathlib import Path
import re

gradle = Path("app/build.gradle")
source = gradle.read_text()
if "signingConfigs.release" not in source:
    source = re.sub(
        r"(android\s*\{)",
        r"""\1
    signingConfigs {
        release {
            storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }
    }
""",
        source,
        count=1,
    )
    source, count = re.subn(
        r"(buildTypes\s*\{\s*release\s*\{)",
        r"\1\n            signingConfig signingConfigs.release",
        source,
        count=1,
    )
    if count != 1:
        raise SystemExit("Could not find the release build type in app/build.gradle")
    gradle.write_text(source)
