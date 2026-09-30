import os
import subprocess
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMG_DIR = os.path.join(BASE_DIR, "images")
JAR_PATH = os.path.join(BASE_DIR, "plantuml.jar")

os.makedirs(IMG_DIR, exist_ok=True)

if not os.path.exists(JAR_PATH):
    print(f"ERROR: {JAR_PATH} does not exist!")
    sys.exit(1)

puml_files = [
    "use_case_diagram.puml",
    "sequence_diagram.puml",
    "activity_diagram.puml",
    "collaboration_diagram.puml",
    "state_machine_diagram.puml",
    "class_diagram.puml",
    "component_diagram.puml",
    "deployment_diagram.puml",
    "object_diagram.puml",
    "package_diagram.puml"
]

print(f"Rendering {len(puml_files)} diagrams using local Java PlantUML...")

for puml in puml_files:
    puml_path = os.path.join(BASE_DIR, puml)
    if not os.path.exists(puml_path):
        print(f"  [MISSING] {puml}")
        continue
    
    # 1. Render PNG
    cmd_png = ["java", "-jar", JAR_PATH, "-tpng", puml_path, "-o", IMG_DIR]
    res_png = subprocess.run(cmd_png, capture_output=True, text=True)
    if res_png.returncode != 0:
        print(f"  [PNG ERROR] {puml}: {res_png.stderr}")
    else:
        png_name = os.path.splitext(puml)[0] + ".png"
        png_path = os.path.join(IMG_DIR, png_name)
        size = os.path.getsize(png_path) if os.path.exists(png_path) else 0
        print(f"  [PNG OK] {png_name} ({size:,} bytes)")

    # 2. Render SVG
    cmd_svg = ["java", "-jar", JAR_PATH, "-tsvg", puml_path, "-o", IMG_DIR]
    res_svg = subprocess.run(cmd_svg, capture_output=True, text=True)
    if res_svg.returncode != 0:
        print(f"  [SVG ERROR] {puml}: {res_svg.stderr}")
    else:
        svg_name = os.path.splitext(puml)[0] + ".svg"
        svg_path = os.path.join(IMG_DIR, svg_name)
        size = os.path.getsize(svg_path) if os.path.exists(svg_path) else 0
        print(f"  [SVG OK] {svg_name} ({size:,} bytes)")

print("\n--- Verification of Generated Diagrams ---")
all_valid = True
for puml in puml_files:
    prefix = os.path.splitext(puml)[0]
    png_path = os.path.join(IMG_DIR, f"{prefix}.png")
    svg_path = os.path.join(IMG_DIR, f"{prefix}.svg")
    
    if not os.path.exists(png_path) or os.path.getsize(png_path) == 0:
        print(f"  [FAIL PNG] {prefix}.png missing or empty!")
        all_valid = False
    
    if not os.path.exists(svg_path) or os.path.getsize(svg_path) == 0:
        print(f"  [FAIL SVG] {prefix}.svg missing or empty!")
        all_valid = False
    else:
        with open(svg_path, "r", encoding="utf-8", errors="ignore") as f:
            svg_content = f.read()
            if "bad URL" in svg_content or "Syntax Error" in svg_content or "HUFFMAN" in svg_content:
                print(f"  [FAIL SVG CONTENT] {prefix}.svg contains error text!")
                all_valid = False
            else:
                print(f"  [VERIFIED VALID] {prefix}: PNG ({os.path.getsize(png_path):,} B) & SVG ({os.path.getsize(svg_path):,} B)")

if all_valid:
    print("\nSUCCESS: All 10 diagrams successfully rendered and verified with local Java PlantUML!")
else:
    print("\nWARNING: Some diagrams had issues.")
