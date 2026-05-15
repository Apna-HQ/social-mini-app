/** @type {import('next').NextConfig} */
const nextConfig = {
    // @apna/sdk ships /ui and /server as raw TS source (export map points at
    // src/*); Next 14 doesn't transpile node_modules by default, so route it
    // through Next's transpilePackages pipeline.
    transpilePackages: ['@apna/sdk'],
    reactStrictMode: false,
    images: {
        minimumCacheTTL: 86400,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
            {
                protocol: 'http',
                hostname: '**',
            }
        ],
    },
};

export default nextConfig;
