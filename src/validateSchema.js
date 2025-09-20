import { z } from 'zod';

// This schema defines all the validation rules for the registration form.
// It is the single source of truth for what makes the form data valid on the frontend.
export const registrationSchema = z.object({
    firstname: z.string().min(1, { message: "First name is required." }),
    lastname: z.string().min(1, { message: "Last name is required." }),
    
    // Username validation rules to match your backend
    username: z.string()
        .min(3, { message: "Username must be at least 3 characters." })
        .regex(/^[a-zA-Z0-9_.-]+$/, { message: "Username can only contain letters, numbers, and _ . -" }),

    email: z.string().email({ message: "Please enter a valid email address." }),
    
    mobileNumber: z.string().regex(/^\d{10}$/, { message: "Please enter a valid 10-digit mobile number." }),

    // Complex password validation rules
    password: z.string()
        .min(8, { message: "Password must be at least 8 characters long." })
        .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter." })
        .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter." })
        .regex(/[0-9]/, { message: "Password must contain at least one number." }),

    confirmPassword: z.string().min(1, { message: "Please confirm your password." })
})
// This special `.refine()` rule checks a condition across multiple fields.
// Here, we ensure that the password and confirmPassword fields are identical.
.refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    // This associates the error message with the 'confirmPassword' field in our form.
    path: ["confirmPassword"], 
});

export const loginSchema = z.object({
    // The user can enter either a username or an email, so we just check that the field is not empty.
    username: z.string().min(1, { message: "Username or Email is required." }),
    
    // We also check that the password field is not empty.
    password: z.string().min(1, { message: "Password is required." }),
});
