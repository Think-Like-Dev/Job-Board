import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    tsconfigPaths: true,
  },

  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react-vendor",
              test: /node_modules[\\/](react|react-dom|react-router-dom|react-hook-form)[\\/]/,
              priority: 30,
            },
            {
              name: "state-vendor",
              test: /node_modules[\\/](@reduxjs|react-redux|@tanstack|zod|datefns|react-day-picker)[\\/]/,
              priority: 25,
            },
            {
              name: "css-vendor",
              test: /node_modules[\\/](@tailwindcss|tailwindcss|tailwind-merge|clsx|class-variance-authority|tw-animate-css|shadcn|cmdk|sonner)[\\/]/,
              priority: 20,
            },
            {
              name: "ui-vendor",
              test: /node_modules[\\/](@base-ui|lucide-react)[\\/]/,
              priority: 15,
            },
            {
              name: "vendor",
              test: /node_modules[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
});
