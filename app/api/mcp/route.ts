import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { SKILLS, SKILL_NAMES } from '@/lib/generated/skills-registry';

// Build skill catalog for the tool description
const skillCatalog = Object.values(SKILLS)
  .map((s) => `- ${s.name}: ${s.description}`)
  .join('\n');

const handler = createMcpHandler(
  (server) => {
    server.tool(
      'load_skill',
      `Load a skill by name. Returns detailed procedures and rules the agent must follow.\n\nAvailable skills:\n${skillCatalog}`,
      { skillName: z.string().describe('The skill name, e.g. "present-widget"') },
      async ({ skillName }) => {
        const skill = SKILLS[skillName];
        if (!skill) {
          const available = SKILL_NAMES.join(', ') || 'none';
          return {
            content: [{ type: 'text' as const, text: `Skill "${skillName}" not found. Available: ${available}` }],
            isError: true,
          };
        }
        return {
          content: [{ type: 'text' as const, text: skill.content }],
        };
      }
    );
  },
  { serverInfo: { name: 'Fexel MCP Server', version: '1.0.0' } },
  { basePath: '/api' }
);

export { handler as GET, handler as POST, handler as DELETE };
