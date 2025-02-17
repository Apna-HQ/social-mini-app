/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    async rewrites() {
        return [
            {
                source: '/storybook',
                destination: '/storybook/index.html',
            },
            {
                source: '/storybook/:path*',
                destination: '/storybook/:path*',
            },
        ];
    },
};

export default nextConfig;
