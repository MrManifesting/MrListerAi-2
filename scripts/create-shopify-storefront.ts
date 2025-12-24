const domain = process.env.SHOPIFY_STORE_DOMAIN;
const accessToken = process.env.SHOPIFY_ADMIN_TOKEN;

if (!domain || !accessToken) {
  console.error('Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_TOKEN');
  process.exit(1);
}

async function createStorefront() {
  const endpoint = `https://${domain}/admin/api/2024-07/graphql.json`;

  const query = `#graphql
    mutation CreateTheme($theme: ThemeInput!) {
      themeCreate(theme: $theme) {
        theme {
          id
          name
        }
        userErrors { field message }
      }
    }
  `;

  const variables = {
    theme: {
      name: 'Summer 2025 Storefront',
      role: 'main',
      src: 'https://cdn.shopify.com/s/files/some-summer-2025-theme.zip'
    }
  };

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken
    },
    body: JSON.stringify({ query, variables })
  });

  const data = await resp.json();
  console.log(JSON.stringify(data, null, 2));
}

createStorefront().catch(err => {
  console.error('Failed to create storefront:', err);
  process.exit(1);
});
