/**
 * WP Code Snippet: [financieel_kompas]
 * Genereert een HMAC-gesigneerd token voor ingelogde abonnees.
 * Zelfde token-formaat als Café Claude SSO (lib/auth/sso.ts).
 *
 * BELANGRIJK: stel INFOFRANKRIJK_SSO_SECRET in als constante in wp-config.php:
 *   define('INFOFRANKRIJK_SSO_SECRET', 'jouw-geheime-sleutel');
 *
 * Of gebruik hetzelfde secret als in Vercel env vars voor CC en FK.
 *
 * VERVANGT: de oude shortcode die ?access=premium gebruikte.
 */

function ifr_financieel_kompas_shortcode() {
    $base_url = 'https://financieel-kompas-ai.vercel.app/';

    // Niet ingelogd of geen leesrechten → freemium (geen token)
    if ( ! is_user_logged_in() || ! current_user_can('read') ) {
        return '<div class="ifr-tool-wrapper" style="width:100%;max-width:960px;margin:0 auto;">'
             . '<iframe src="' . esc_url($base_url) . '" '
             . 'style="width:100%;min-height:800px;border:none;" '
             . 'allow="clipboard-write" loading="lazy"></iframe>'
             . '</div>';
    }

    // Ingelogde abonnee → genereer HMAC-token
    $secret = defined('INFOFRANKRIJK_SSO_SECRET') ? INFOFRANKRIJK_SSO_SECRET : '';
    if ( empty($secret) ) {
        // Fallback: oud gedrag (wordt uitgefaseerd)
        $url = add_query_arg('access', 'premium', $base_url);
    } else {
        $user  = wp_get_current_user();
        $email = $user->user_email;
        $timestamp = time();
        $message   = $email . ':' . $timestamp;
        $signature = hash_hmac('sha256', $message, $secret);

        $payload = json_encode(array(
            'email'     => $email,
            'timestamp' => $timestamp,
            'signature' => $signature,
        ));
        $token = base64_encode($payload);

        $url = add_query_arg('token', $token, $base_url);
    }

    return '<div class="ifr-tool-wrapper" style="width:100%;max-width:960px;margin:0 auto;">'
         . '<iframe src="' . esc_url($url) . '" '
         . 'style="width:100%;min-height:800px;border:none;" '
         . 'allow="clipboard-write" loading="lazy"></iframe>'
         . '</div>';
}
add_shortcode('financieel_kompas', 'ifr_financieel_kompas_shortcode');


/**
 * BONUS: generieke shortcode [ifr_tool] voor ELKE tool.
 * Gebruik: [ifr_tool url="https://energieportaal.vercel.app/"]
 *
 * Genereert hetzelfde HMAC-token — elke Vercel-app die
 * INFOFRANKRIJK_SSO_SECRET kent kan het verifiëren.
 */
function ifr_tool_shortcode($atts) {
    $atts = shortcode_atts(array(
        'url'        => '',
        'min_height' => '800px',
    ), $atts, 'ifr_tool');

    $base_url = $atts['url'];
    if ( empty($base_url) ) return '<!-- ifr_tool: url ontbreekt -->';

    // Niet ingelogd → freemium
    if ( ! is_user_logged_in() || ! current_user_can('read') ) {
        $url = $base_url;
    } else {
        $secret = defined('INFOFRANKRIJK_SSO_SECRET') ? INFOFRANKRIJK_SSO_SECRET : '';
        if ( empty($secret) ) {
            $url = $base_url;
        } else {
            $user  = wp_get_current_user();
            $email = $user->user_email;
            $timestamp = time();
            $message   = $email . ':' . $timestamp;
            $signature = hash_hmac('sha256', $message, $secret);

            $payload = json_encode(array(
                'email'     => $email,
                'timestamp' => $timestamp,
                'signature' => $signature,
            ));
            $token = base64_encode($payload);

            $url = add_query_arg('token', $token, $base_url);
        }
    }

    return '<div class="ifr-tool-wrapper" style="width:100%;max-width:960px;margin:0 auto;">'
         . '<iframe src="' . esc_url($url) . '" '
         . 'style="width:100%;min-height:' . esc_attr($atts['min_height']) . ';border:none;" '
         . 'allow="clipboard-write" loading="lazy"></iframe>'
         . '</div>';
}
add_shortcode('ifr_tool', 'ifr_tool_shortcode');
