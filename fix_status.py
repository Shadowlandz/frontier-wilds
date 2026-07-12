import os
os.chdir('/home/daytona/codebase')

with open('src/game/Game.ts', 'r') as f:
    content = f.read()

# Find the updateStatusEffects method
idx = content.find('private updateStatusEffects(dt: number): void {')
next_m = content.find('private applyStatusEffectToPlayer', idx)

# Get the text between
between = content[idx:next_m]
print(repr(between))

# The method needs closing braces. Find the last line of the method body
# and add the missing braces before the next method
old_end = '            if (se.type === ' + "'burn') {"
new_end = old_end + '\n              this.spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, ' + "'#ff4400'" + ', 2, ' + "'ember'" + ', { spread: 40, speed: 30, sizeRange: [2, 4], lifeRange: [0.3, 0.6] });\n            }\n            if (enemy.hp <= 0) {\n              this.killEnemy(enemy);\n              break;\n            }\n          }\n        }\n\n        if (se.remaining <= 0) {\n          enemy.statusEffects.splice(i, 1);\n        }\n      }\n    }\n  }'
content = content.replace(between, between.rstrip() + '\n            if (se.type === ' + "'burn') {")
