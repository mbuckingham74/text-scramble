const { z } = require('zod');
const { MIN_WORD_LENGTH, MAX_WORD_LENGTH } = require('./constants');

// Password must be at least 8 characters with mixed character types
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(100)
  .refine(
    (pw) => /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[0-9]/.test(pw),
    'Password must contain lowercase, uppercase, and a number'
  );

const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: passwordSchema
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

const validateWordSchema = z.object({
  word: z.string().min(MIN_WORD_LENGTH).max(MAX_WORD_LENGTH).regex(/^[a-zA-Z]+$/),
  sessionId: z.string().length(32).regex(/^[a-f0-9]+$/)
});

const solutionsSchema = z.object({
  sessionId: z.string().length(32).regex(/^[a-f0-9]+$/)
});

const scoreSchema = z.object({
  sessionId: z.string().length(32).regex(/^[a-f0-9]+$/)
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
