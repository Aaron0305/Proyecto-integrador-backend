import fetch from 'node-fetch';

export const verifyRecaptcha = async (token) => {
    try {
        const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
        });

        const data = await response.json();
        
        // Para reCAPTCHA v3, verificamos el score
        if (data.success && data.score >= 0.5) {
            return {
                success: true,
                score: data.score
            };
        }

        return {
            success: false,
            error: 'Verificación de reCAPTCHA fallida'
        };
    } catch (error) {
        console.error('Error al verificar reCAPTCHA:', error);
        return {
            success: false,
            error: 'Error al verificar reCAPTCHA'
        };
    }
};