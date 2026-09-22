Pod::Spec.new do |s|
  s.name = 'SiteProbe'
  s.version = '1.0.0'
  s.summary = 'Status-only website reachability probes'
  s.description = 'An isolated HTTP client for website availability checks.'
  s.license = 'MIT'
  s.author = 'testwhitelist'
  s.homepage = 'https://github.com/Aleksey-Kon/white-list-test'
  s.source = { git: 'https://github.com/Aleksey-Kon/white-list-test.git' }
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
end
