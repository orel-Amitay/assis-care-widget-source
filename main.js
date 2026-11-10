import { createApp } from 'vue'
import App from './App.vue'

/** WordPress optimization plugins may run this script before wp_footer prints the mount node. */
function waitForAssisMountEl(timeoutMs = 10000) {
    const existing = document.getElementById('assis-plugin-app')
    if (existing) return Promise.resolve(existing)

    return new Promise((resolve) => {
        let settled = false
        const finish = (el) => {
            if (settled) return
            settled = true
            obs.disconnect()
            clearTimeout(timer)
            resolve(el)
        }
        const obs = new MutationObserver(() => {
            const el = document.getElementById('assis-plugin-app')
            if (el) finish(el)
        })
        obs.observe(document.documentElement, { childList: true, subtree: true })
        const timer = setTimeout(() => finish(document.getElementById('assis-plugin-app')), timeoutMs)
    })
}

const initVue = async () => {
    const el = await waitForAssisMountEl()

    if (!el) return

    const props = {
        businessName: el.dataset.businessName,
        heartPosition: el.dataset.heartPosition,
        heartSize: el.dataset.heartSize,
        assisBackendUrl: el.dataset.assisBackendUrl,
        buttonLabel: el.dataset.buttonLabel,
        loginChannels: el.dataset.loginChannels,
        businessLogo: el.dataset.businessLogo,
        direction: el.dataset.direction,
        language: el.dataset.language,
        phonePrefix: el.dataset.phonePrefix,
        communicationChannels: el.dataset.communicationChannels,
        shouldBeOpenedOnDesktopOnLoad: el.dataset.shouldBeOpenedOnDesktopOnLoad,
        isShopifyWebsite: String(el.dataset.isShopifyWebsite || '').toLowerCase() === 'true',
    }

    const cssUrl = el.dataset.cssUrl || el.dataset.assisCssUrl || ''

    // Prefer Shadow DOM isolation when we can also inject CSS into it (prevents leaking into host page).
    // Host pages (e.g. WordPress) can control explicitly via: data-use-shadow-dom="true|false"
    // If no cssUrl is provided, we keep non-shadow mode so styles still work in dev/HMR scenarios.
    const useShadowDom =
        (el.dataset.useShadowDom != null
            ? el.dataset.useShadowDom
            : (cssUrl ? 'true' : 'false')
        ).toLowerCase() === 'true'

    if (useShadowDom && el.attachShadow) {
        const shadow = el.shadowRoot || el.attachShadow({ mode: 'open' })

        // Inject widget CSS into the shadow root so WP CSS can't affect us.
        // Prefer inlining the CSS text (more reliable than <link> in some WP contexts).
        if (cssUrl) {
            try {
                const res = await fetch(cssUrl, { credentials: 'same-origin' })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const cssText = await res.text()
                const style = document.createElement('style')
                style.textContent = cssText
                shadow.appendChild(style)
            } catch (e) {
                // Fallback to link if fetch is blocked (CORS, CSP, etc.)
                const link = document.createElement('link')
                link.rel = 'stylesheet'
                link.href = cssUrl
                shadow.appendChild(link)
            }
        }

        // Dedicated mount + teleport targets inside shadow root
        const mountEl = document.createElement('div')
        mountEl.id = 'assis-plugin-app-root'
        shadow.appendChild(mountEl)

        const teleportEl = document.createElement('div')
        teleportEl.id = 'assis-plugin-teleports'
        shadow.appendChild(teleportEl)

        const app = createApp(App, { ...props, teleportTarget: teleportEl })
        app.mount(mountEl)
        return
    }

    const app = createApp(App, props)
    app.mount('#assis-plugin-app')
}

// Important : WordPress peut déjà avoir chargé le DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVue)
} else {
    initVue()
}
