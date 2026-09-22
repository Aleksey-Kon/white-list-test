package expo.modules.siteprobe

import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.IOException
import java.security.SecureRandom
import java.security.cert.X509Certificate
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLContext
import javax.net.ssl.X509TrustManager
import okhttp3.Call
import okhttp3.Callback
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response

class SiteProbeModule : Module() {
  // Deliberately isolated from React Native's HTTP client. This client only
  // checks reachability: no cookies, credentials, request bodies or response data.
  private val client by lazy {
    val trustManager = object : X509TrustManager {
      override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) = Unit
      override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) = Unit
      override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
    }
    val context = SSLContext.getInstance("TLS").apply {
      init(null, arrayOf(trustManager), SecureRandom())
    }
    OkHttpClient.Builder()
      .sslSocketFactory(context.socketFactory, trustManager)
      .hostnameVerifier { _, _ -> true }
      // The first redirect is already a response from the probed site.
      .followRedirects(false)
      .followSslRedirects(false)
      .cache(null)
      .build()
  }

  override fun definition() = ModuleDefinition {
    Name("SiteProbe")

    AsyncFunction("requestStatus") { url: String, method: String, timeoutMs: Int, promise: Promise ->
      require(method == "GET" || method == "HEAD") { "Only GET and HEAD probes are supported" }
      require(timeoutMs in 1..30_000) { "Invalid probe timeout" }
      val request = Request.Builder()
        .url(url)
        .method(method, null)
        .header("Cache-Control", "no-store")
        .build()
      require(request.url.username.isEmpty() && request.url.password.isEmpty()) {
        "Probe URLs must not contain credentials"
      }
      val call = client.newCall(request)
      call.timeout().timeout(timeoutMs.toLong(), TimeUnit.MILLISECONDS)
      call.enqueue(object : Callback {
        override fun onFailure(call: Call, error: IOException) {
          promise.reject("ERR_SITE_PROBE", error.message, error)
        }

        override fun onResponse(call: Call, response: Response) {
          // Headers suffice; do not download a potentially large page body.
          response.use {
            val status = it.code
            call.cancel()
            promise.resolve(status)
          }
        }
      })
    }

    OnDestroy {
      client.dispatcher.cancelAll()
      client.connectionPool.evictAll()
    }
  }
}
