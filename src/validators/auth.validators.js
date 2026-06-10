export const registerSchema = {
    nombre:   { required: true,  type: "string" },
    email:    { required: true,  type: "string" },
    password: { required: true,  type: "string" },
};

export const loginSchema = {
    email:    { required: true, type: "string" },
    password: { required: true, type: "string" },
};
