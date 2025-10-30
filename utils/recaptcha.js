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
        
        // Para reCAPTCHA v3 comprobamos el score; para v2 basta con success=true
        if (data.success) {
            if (typeof data.score === 'number') {
                // reCAPTCHA v3: require score threshold (más laxo en desarrollo)
                const threshold = parseFloat(process.env.RECAPTCHA_SCORE_THRESHOLD || '0.3');
                if (data.score >= threshold) {
                    return { success: true, score: data.score };
                }
                return { success: false, error: 'Score de reCAPTCHA bajo', score: data.score };
            }

            // reCAPTCHA v2: success true es suficiente
            return { success: true };
        }

        return {
            success: false,
            error: 'Verificación de reCAPTCHA fallida',
            errorCodes: data['error-codes'],
            hostname: data.hostname,
        };
    } catch (error) {
        console.error('Error al verificar reCAPTCHA:', error);
        return {
            success: false,
            error: 'Error al verificar reCAPTCHA'
        };
    }
};