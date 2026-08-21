import { createHash } from 'node:crypto'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

/**
 * GitHub Pages serves a project site from a subpath, so the built asset URLs
 * have to be prefixed. Locally the app is served from the root, and forcing the
 * subpath there would move the dev server to /Chambre-Noire/ and break the SSH
 * tunnel workflow, so the prefix is applied only in CI.
 */
const base = process.env.GITHUB_ACTIONS ? '/Chambre-Noire/' : '/'

/**
 * GitHub Pages cannot set response headers, so the Content-Security-Policy has
 * to travel in a meta tag. The inline scripts are allowed by hash rather than
 * by 'unsafe-inline': the hashes are computed here at build time so they cannot
 * drift out of date with the scripts they authorise.
 *
 * style-src keeps 'unsafe-inline' because React writes style attributes at
 * runtime (the charts position elements that way) and a runtime value cannot be
 * hashed ahead of time.
 *
 * frame-ancestors is deliberately absent: it is ignored in a meta tag and only
 * works as a real header, so claiming it here would be theatre.
 */
function cspPlugin(): Plugin {
    return {
        name: 'inline-csp',
        transformIndexHtml: {
            order: 'post',
            handler(html, ctx) {
                // In dev, Vite injects its own inline HMR scripts whose hashes
                // cannot be known ahead of time, and the policy belongs to the
                // deployed host anyway. Drop the tag rather than leave the
                // placeholder in place, which browsers report as an invalid
                // directive on every page load.
                if (ctx.server) {
                    return html.replace(/\s*<meta http-equiv="Content-Security-Policy"[^>]*>/, '');
                }
                const hashes: string[] = []
                for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
                    const digest = createHash('sha256').update(m[1], 'utf8').digest('base64')
                    hashes.push(`'sha256-${digest}'`)
                }
                const policy = [
                    "default-src 'self'",
                    `script-src 'self' ${hashes.join(' ')}`.trim(),
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                    "font-src 'self' https://fonts.gstatic.com",
                    "img-src 'self' data:",
                    "connect-src 'self'",
                    "manifest-src 'self'",
                    "worker-src 'self'",
                    "object-src 'none'",
                    "base-uri 'self'",
                    "form-action 'none'",
                ].join('; ')
                return html.replace('__CSP_PLACEHOLDER__', policy)
            },
        },
    }
}

/**
 * The service worker is served from public/ verbatim, so it cannot read the
 * package version itself. Stamping the version into CACHE_NAME at build time is
 * what makes a release actually reach returning visitors: the worker serves
 * cache-first, and only a changed cache name evicts the previous build.
 */
function swVersionPlugin(): Plugin {
    return {
        name: 'sw-version',
        apply: 'build',
        writeBundle(options) {
            const swPath = resolve(options.dir ?? 'dist', 'sw.js')
            try {
                const src = readFileSync(swPath, 'utf8')
                writeFileSync(swPath, src.replace(/__APP_VERSION__/g, pkg.version))
            } catch {
                // no service worker in this build; nothing to stamp
            }
        },
    }
}

/**
 * public/ is copied into the build verbatim, which makes public/import/ a trap:
 * it is where a personal backup is staged before importing it into the app, it
 * is gitignored so CI never sees it, and a local build would therefore quietly
 * publish a real logbook to a public site. Deleting it from the output means
 * that cannot happen no matter who runs the build.
 */
function stripImportStagingPlugin(): Plugin {
    return {
        name: 'strip-import-staging',
        apply: 'build',
        writeBundle(options) {
            const staged = resolve(options.dir ?? 'dist', 'import')
            if (existsSync(staged)) {
                rmSync(staged, { recursive: true, force: true })
                this.warn('removed public/import/ from the build output: it stages personal data and must never ship')
            }
        },
    }
}

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react(), cspPlugin(), swVersionPlugin(), stripImportStagingPlugin()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
