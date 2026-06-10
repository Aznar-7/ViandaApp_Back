const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const registerSchema = {
    nombre:   { required: true,  type: "string", minLength: 2,  maxLength: 100 },
    email:    { required: true,  type: "string", pattern: emailPattern },
    password: { required: true,  type: "string", minLength: 6,  maxLength: 72 },
};

export const loginSchema = {
    email:    { required: true, type: "string", pattern: emailPattern },
    password: { required: true, type: "string", minLength: 1 },
};
