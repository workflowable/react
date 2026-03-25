import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        setupFiles: ['./tests/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov', 'clover'],
            include: ['src/**/*.ts', 'src/**/*.tsx'],
            exclude: ['src/index.ts'],
        },
        projects: [
            {
                test: {
                    name: 'converter',
                    environment: 'node',
                    include: ['tests/converter/**/*.test.ts'],
                },
            },
            {
                test: {
                    name: 'hooks',
                    environment: 'jsdom',
                    include: ['tests/hooks/**/*.test.ts'],
                },
            },
        ],
    },
});
