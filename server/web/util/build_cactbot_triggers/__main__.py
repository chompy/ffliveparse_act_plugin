
import os
import glob
import json
from jsmin import jsmin

TRIGGER_JS_PATH = os.path.join(os.path.realpath(os.path.dirname(__file__)), "cactbot/ui/raidboss/data/triggers")
DUMP_FILE = os.path.join(os.path.realpath(os.path.dirname(__file__)), "../../static/data/cactbot.triggers.json")

output = {}

os.chdir(TRIGGER_JS_PATH)
for file in glob.glob("*.js"):
    with open(file, "r", encoding="utf8") as f:
        output[file] = jsmin(f.read())

with open(DUMP_FILE, "w") as f:
    json.dump(output, f)