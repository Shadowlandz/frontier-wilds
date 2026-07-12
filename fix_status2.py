import os
os.chdir('/home/daytona/codebase')

with open('src/game/Game.ts', 'r') as f:
    content = f.read()

# Find the method and insert proper closing braces
# The method starts with private updateStatusEffects
method_start = 'private updateStatusEffects(dt: number): void {'
idx = content.find(method_start)

# Find where the next method starts (the broken transition point)
# We need to find the orphaned code and fix it
# Look for: 'private applyStatusEffectToPlayer' - this is the next method
next_method_marker = 'private applyStatusEffectToPlayer'
next_idx = content.find(next_method_marker, idx)

# Find the actual transition - look for the pattern where 
# the if (se.type === 'burn') block ends with no closing
search_from = idx
# Find the string 'if (se.type === 'burn')' in this method
burn_idx = content.find("if (se.type === 'burn')", search_from, next_idx)
if burn_idx >= 0:
    # Find the closing } of this if block
    after_burn = content[burn_idx:next_idx]
    # Count braces
    opens = after_burn.count('{')
    closes = after_burn.count('}')
    print(f"Found burn check at offset {burn_idx}")
    print(f"In section: opens={opens}, closes={closes}")
    print(f"Section length: {len(after_burn)}")
    print(f"Last 150 chars: {repr(after_burn[-150:])}")
    
    # Find the end of the method by examining the structure
    # We need to add: 
    # }  - close if (hp <= 0) inside while
    # }  - close while loop  
    # }  - close if (damagePerTick)
    # }  - close for (status effects)
    # if (se.remaining <= 0) { splice }
    # }  - close for (enemies)
    # }  - close method
    
    # The current end of the method has: 
    #     } (close if se.type === burn)
    # Then immediately jumps to next method
    # We need to insert at this point:
    
    fix_text = """            }
            if (enemy.hp <= 0) {
              this.killEnemy(enemy);
              break;
            }
          }
        }

        if (se.remaining <= 0) {
          enemy.statusEffects.splice(i, 1);
        }
      }
    }
  }

  """
    
    # Find the exact position after the closing of if (se.type === 'burn')
    # The block is: if (se.type === 'burn') { ... } (with the inner spawnParticles call)
    # After the closing }, there should be the rest of the method
    
    # Let me find the end of the burn if block
    # Find the spawnParticles line first
    spawn_idx = content.find("this.spawnParticles(enemy.x", burn_idx)
    if spawn_idx >= 0:
        spawn_line_end = content.find('\n', spawn_idx)
        # After spawnParticles line, there should be a closing }
        # Find the next closing } after spawnParticles
        close_burn = content.find('\n            }', spawn_line_end)
        if close_burn >= 0 and close_burn < next_idx:
            # This is the end of the if (se.type === 'burn') block
            print(f"End of burn block at {close_burn}")
            print(f"Text after: {repr(content[close_burn:close_burn+50])}")
            
            # Replace from after the burn block to the next method
            old = content[close_burn:next_idx]
            new = fix_text
            content = content.replace(old, new, 1)
            print("Fixed!")
        else:
            print(f"Could not find close_burn. close_burn={close_burn}, next_idx={next_idx}")
else:
    print("Could not find burn check in updateStatusEffects")
    # Try to find the method body end
    method_body = content[idx:next_idx]
    print(f"Method body length: {len(method_body)}")
    print(f"Last 200 chars: {repr(method_body[-200:])}")

with open('src/game/Game.ts', 'w') as f:
    f.write(content)
print("Done")
