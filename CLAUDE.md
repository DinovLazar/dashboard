# CLAUDE.md

@AGENTS.md

## Implementation Standard

Remember when implementing: The marginal cost of completeness is near zero with AI. Do the whole thing. Do it right. Do it with tests. Do it with documentation. Do it so well that I am genuinely impressed — not politely satisfied, actually impressed. Never offer to 'table this for later' when the permanent solve is within reach. Never leave a dangling thread when tying it off takes five more minutes. Never present a workaround when the real fix exists. The standard isn't 'good enough' — it's 'holy shit, that's done.' Search before building. Test before shipping. Ship the complete thing. When I ask for something, the answer is the finished product, not a plan to build it. Time is not an excuse. Fatigue is not an excuse. Complexity is not an excuse. Boil the ocean.

## One rule that overrides "boil the ocean" on this project

This portal holds the keys to edit **every client's** blog. A scoping or token-handling bug means one client can edit another client's live website. When a choice is between "ship more" and "prove isolation is airtight," prove isolation. See `AGENTS.md` → Security boundary, and `src/_project-state/dashboard-Project-Instructions.md` → §5.
