const { z } = require('zod');

const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string().min(4).max(100)
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

const validateWordSchema = z.object({
  word: z.string().min(3).max(8).regex(/^[a-zA-Z]+$/),
  letters: z.array(z.string().length(1).regex(/^[a-zA-Z]$/)).min(6).max(8),
  sessionId: z.string().length(32).regex(/^[a-f0-9]+$/).optional()
});

const solutionsSchema = z.object({
  letters: z.array(z.string().length(1).regex(/^[a-zA-Z]$/)).min(6).max(8)
});

const scoreSchema = z.object({
  sessionId: z.string().length(32).regex(/^[a-f0-9]+$/).optional(),
  // Legacy fields (accepted but not trusted if sessionId present)
  score: z.number().int().min(0).max(1000000).optional(),
  level: z.number().int().min(1).max(1000).optional(),
  wordsFound: z.number().int().min(0).max(500).optional(),
  gameMode: z.enum(['timed', 'untimed']).optional()
});

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    req.validated = result.data;
    next();
  };
}

module.exports = {
  registerSchema,
  loginSchema,
  validateWordSchema,
  solutionsSchema,
  scoreSchema,
  validate
};
