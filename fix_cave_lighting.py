import os
os.chdir('/home/daytona/codebase')

with open('src/game/Game.ts', 'r') as f:
    content = f.read()

# Find the cave darkness overlay section
start_marker = '    // ── Cave darkness overlay (always dark underground) ──'
start_idx = content.find(start_marker)

if start_idx < 0:
    print("ERROR: Could not find cave darkness overlay section")
    exit(1)

# Find the end of this section - it's the closing } of the if(this.inCave) block
# After the last } there should be blank line then the next section
# Find the closing } of the if block - skip past the lava section
end_marker = '      // Subtle lava ambient glow'
lava_idx = content.find(end_marker, start_idx)
if lava_idx < 0:
    print("ERROR: Could not find lava ambient glow section")
    exit(1)

# Find the closing } after lava section ends
# The lava section is:
#       if (this.caveData) {
#         ...
#       }
#     }
end_idx = content.find('\n    }\n\n', lava_idx)
if end_idx < 0:
    end_idx = content.find('\n    }\n    ctx.save', lava_idx)
    if end_idx < 0:
        end_idx = content.find('\n    }\n\n    ctx.save', lava_idx)
        
# Find the exact end
search_from = lava_idx
# Find the closing } of the if caveData block
close1 = content.find('\n      }', search_from)
if close1 < 0:
    print("Could not find close1")
    exit(1)
# Find the closing } of the inCave block  
close2 = content.find('\n    }', close1 + 1)
if close2 < 0:
    print("Could not find close2")
    exit(1)

end_idx = close2 + 6  # include the closing }

# Get the old text to replace
old_text = content[start_idx:end_idx]

# New improved cave lighting code
new_text = '''    // ── Cave darkness overlay (improved lighting) ──
    if (this.inCave) {
      // Base cave atmosphere: lighter than before — still dark but playable
      ctx.fillStyle = 'rgba(0, 0, 10, 0.35)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ── Warm ambient cave glow (torch-less visibility) ──
      const ambTime = performance.now() / 1000;
      const ambPulse = 0.85 + 0.15 * Math.sin(ambTime * 0.3);
      const ambientGlow = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.7
      );
      ambientGlow.addColorStop(0, `rgba(180, 140, 80, ${0.04 * (ambPulse as number)})`);
      ambientGlow.addColorStop(0.5, `rgba(100, 70, 40, ${0.03 * (ambPulse as number)})`);
      ambientGlow.addColorStop(1, 'rgba(0, 0, 10, 0)');
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = ambientGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ── Player-centered dynamic light ──
      const playerScreen = camera.worldToScreen(
        player.x + PLAYER_SIZE / 2,
        player.y + PLAYER_SIZE / 2
      );
      const hasTorchItem = this.getCurrentItem()?.toolType === 'torch';
      
      // Torch: wide warm light with strong flicker
      // No torch: generous ambient visibility (still atmospheric)
      const flickerVal = hasTorchItem 
        ? Math.sin(ambTime * 6 + player.x * 0.1) * 30 + Math.sin(ambTime * 13) * 10
        : Math.sin(ambTime * 2) * 5;
      const lightRadius = hasTorchItem ? 480 + flickerVal : 240 + flickerVal;

      // ── Warm light gradient (source-over) ──
      const warmLight = ctx.createRadialGradient(
        playerScreen.x, playerScreen.y, 0,
        playerScreen.x, playerScreen.y, lightRadius
      );
      if (hasTorchItem) {
        warmLight.addColorStop(0, 'rgba(255, 200, 100, 0.20)');
        warmLight.addColorStop(0.1, 'rgba(255, 180, 70, 0.10)');
        warmLight.addColorStop(0.3, 'rgba(255, 160, 50, 0.04)');
        warmLight.addColorStop(0.6, 'rgba(200, 140, 60, 0.02)');
        warmLight.addColorStop(1, 'rgba(0, 0, 10, 0)');
      } else {
        // Hands/ambient: soft cool-blue glow
        warmLight.addColorStop(0, 'rgba(180, 200, 255, 0.04)');
        warmLight.addColorStop(0.5, 'rgba(100, 120, 180, 0.02)');
        warmLight.addColorStop(1, 'rgba(0, 0, 10, 0)');
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = warmLight;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ── Visibility punch-through (destination-out) ──
      ctx.globalCompositeOperation = 'destination-out';
      const visibilityHole = ctx.createRadialGradient(
        playerScreen.x, playerScreen.y, 8,
        playerScreen.x, playerScreen.y, lightRadius + 40
      );
      if (hasTorchItem) {
        visibilityHole.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
        visibilityHole.addColorStop(0.25, 'rgba(0, 0, 0, 0.70)');
        visibilityHole.addColorStop(0.55, 'rgba(0, 0, 0, 0.35)');
        visibilityHole.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        visibilityHole.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
        visibilityHole.addColorStop(0.3, 'rgba(0, 0, 0, 0.30)');
        visibilityHole.addColorStop(0.6, 'rgba(0, 0, 0, 0.10)');
        visibilityHole.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.fillStyle = visibilityHole;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';

      // ── Lava ambient glow (pulsing, warmer) ──
      if (this.caveData) {
        const lavaGlow = Math.sin(ambTime * 0.8) * 0.04 + 0.08;
        ctx.fillStyle = `rgba(255, 80, 0, ${lavaGlow})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // ── Glowing shroom / crystal ambiance (random tiny dots) ──
      const dotsSeed = Math.floor(this.state.player.x / 100) + Math.floor(this.state.player.y / 100);
      const dotCount = 6 + Math.floor(Math.abs(Math.sin(dotsSeed)) * 6);
      for (let d = 0; d < dotCount; d++) {
        const dx2 = (Math.sin(dotsSeed * 13.7 + d * 7.3) * 0.5 + 0.5) * canvas.width;
        const dy2 = (Math.cos(dotsSeed * 9.1 + d * 11.7) * 0.5 + 0.5) * canvas.height;
        const dotPulse = 0.3 + 0.7 * Math.sin(ambTime * (0.5 + d * 0.1) + d * 2.1);
        const dotColor = d % 3 === 0 
          ? `rgba(100, 255, 150, ${dotPulse * 0.15})`
          : d % 3 === 1
            ? `rgba(80, 180, 255, ${dotPulse * 0.12})`
            : `rgba(200, 100, 255, ${dotPulse * 0.10})`;
        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(dx2, dy2, 2 + dotPulse * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }'''

# Replace
if old_text in content:
    content = content.replace(old_text, new_text, 1)
    with open('src/game/Game.ts', 'w') as f:
        f.write(content)
    print("✅ Cave lighting improved successfully!")
else:
    print("❌ Could not find exact old_text to replace")
    print(f"First 100 chars of old_text: {repr(old_text[:100])}")
    # Debug: check if start marker is found
    tmp = content.find(start_marker)
    print(f"Start marker found at: {tmp}")
    if tmp >= 0:
        print(f"Content at start: {repr(content[tmp:tmp+100])}")
