import ExpoModulesCore
import Foundation

public class SiteProbeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SiteProbe")

    AsyncFunction("requestStatus") { (url: String, method: String, timeoutMs: Int, promise: Promise) in
      guard let target = URL(string: url),
            let scheme = target.scheme?.lowercased(),
            ["https", "http"].contains(scheme),
            target.host != nil, target.user == nil, target.password == nil,
            ["GET", "HEAD"].contains(method), (1...30_000).contains(timeoutMs) else {
        promise.reject("ERR_SITE_PROBE", "Invalid probe request")
        return
      }
      let configuration = URLSessionConfiguration.ephemeral
      configuration.urlCache = nil
      configuration.httpCookieStorage = nil
      configuration.urlCredentialStorage = nil
      configuration.timeoutIntervalForRequest = Double(timeoutMs) / 1000
      configuration.timeoutIntervalForResource = Double(timeoutMs) / 1000
      // URLSession retains its delegate until invalidated on response/failure.
      let delegate = ProbeDelegate(promise: promise)
      let session = URLSession(configuration: configuration, delegate: delegate, delegateQueue: nil)
      var request = URLRequest(url: target)
      request.httpMethod = method
      request.cachePolicy = .reloadIgnoringLocalCacheData
      request.setValue("no-store", forHTTPHeaderField: "Cache-Control")
      session.dataTask(with: request).resume()
    }
  }
}

private final class ProbeDelegate: NSObject, URLSessionDataDelegate {
  private var promise: Promise?

  init(promise: Promise) {
    self.promise = promise
  }

  func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge,
                  completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
    if challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
       let trust = challenge.protectionSpace.serverTrust {
      // Accept invalid/expired/self-signed certificates only in this probe session.
      completionHandler(.useCredential, URLCredential(trust: trust))
    } else {
      completionHandler(.performDefaultHandling, nil)
    }
  }

  func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse,
                  completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
    if let response = response as? HTTPURLResponse {
      promise?.resolve(response.statusCode)
    } else {
      promise?.reject("ERR_SITE_PROBE", "No HTTP response")
    }
    promise = nil
    completionHandler(.cancel)
    session.invalidateAndCancel()
  }

  func urlSession(_ session: URLSession, task: URLSessionTask,
                  willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest,
                  completionHandler: @escaping (URLRequest?) -> Void) {
    // Keep the original 3xx response; do not follow cookie/JavaScript challenges.
    completionHandler(nil)
  }

  func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
    if let error = error {
      promise?.reject(error)
    } else {
      promise?.reject("ERR_SITE_PROBE", "No HTTP response")
    }
    promise = nil
    session.invalidateAndCancel()
  }
}
