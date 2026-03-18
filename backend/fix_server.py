"""
Final cleanup: Remove orphan broken block from server.py.
Strategy: Keep all lines from start to end of clean tao_quiz function,
then attach everything from the '# ===== WebSocket Endpoint =====' line to end.
"""

# Read the file
filepath = r'e:\Learnify_Mentor_AI\backend\server.py'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Find the end of the clean tao_quiz function
# It ends at: "        return {\"quiz\": []}" which is at line ~590
# We need to find the FIRST occurrence (clean section) and the WebSocket section

clean_end_idx = None
ws_section_idx = None

for i, line in enumerate(lines):
    stripped = line.strip()
    
    # Look for the clean tao_quiz function's return statement
    # The clean version uses "return {\"quiz\": []}" in ASCII quotes
    if stripped == 'return {"quiz": []}' and clean_end_idx is None:
        # Check that this is in the clean section (not the first occurrence)
        # By checking if there's a proper function end here
        clean_end_idx = i
        print(f"Found first 'return {{\"quiz\": []}}' at line {i+1}")
    
    # Find WebSocket endpoint
    if '@app.websocket("/ws/chat/{session_id}")' in line:
        ws_section_idx = i
        print(f"Found @app.websocket at line {i+1}")
        break

print(f"clean_end_idx: {clean_end_idx}, ws_section_idx: {ws_section_idx}")

if clean_end_idx is not None and ws_section_idx is not None:
    # Keep: lines 0...clean_end_idx+1, then blank line, then ws_section onwards
    new_lines = lines[:clean_end_idx + 1] + ['\n', '\n', '# ===== WebSocket Endpoint =====\n', '\n', '\n'] + lines[ws_section_idx:]
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f"SUCCESS! New total lines: {len(new_lines)}")
    print(f"Deleted {ws_section_idx - clean_end_idx - 1} orphan lines")
else:
    print("Could not find markers, aborting")
    print(f"clean_end_idx={clean_end_idx}, ws_section_idx={ws_section_idx}")
