import React from "react";
import { useTranslation } from "react-i18next";
import { Copy, Globe, Terminal } from "lucide-react";
import { cn } from "../../lib/cn";

type CodeExample = {
  language: string;
  code: string;
  description: string;
};

export function CodeExamples({ mode }: { mode: "sandbox" | "production" }) {
  const { t } = useTranslation(["pages", "common"]);

  const examples: CodeExample[] = [
    {
      language: "Node.js",
      code: `const fetch = require("node-fetch");

const apiKey = "gnet_sandbox_YOUR_SANDBOX_KEY";
// or for production: const apiKey = "gnet_live_YOUR_PRODUCTION_KEY";

const url = \`https://api.yourschool.com/api/schools/:schoolId/students?limit=10\`;

const options = {
  method: "GET",
  headers: {
    "X-API-Key": apiKey,
    "Content-Type": "application/json",
  },
};

fetch(url, options)
  .then((res) => res.json())
  .then((data) => console.log(data))
  .catch((err) => console.error("Error:", err));`
    ,
      description: "Node.js (native fetch) - sandbox key: gnet_sandbox_*, production: gnet_live_*",
    },
    {
      language: "Python",
      code: `import requests

api_key = "gnet_sandbox_YOUR_SANDBOX_KEY"
// for production: api_key = "gnet_live_YOUR_PRODUCTION_KEY"

url = "https://api.yourschool.com/api/schools/:schoolId/students"

headers = {
    "X-API-Key": api_key,
    "Content-Type": "application/json",
}

response = requests.get(url, headers=headers)
print(response.json())`
    ,
      description: "Python requests - sandbox key prefix: gnet_sandbox_, production: gnet_live_",
    },
    {
      language: "Java",
      code: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

String apiKey = "gnet_sandbox_YOUR_SANDBOX_KEY";
// for production: String apiKey = "gnet_live_YOUR_PRODUCTION_KEY";

String url = "https://api.yourschool.com/api/schools/:schoolId/students?limit=10";

HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create(url))
    .header("X-API-Key", apiKey)
    .header("Content-Type", "application/json")
    .GET()
    .build();

client.sendAsync(request, HttpResponse.BodyHandlers.ofString())
    .then(response -> {
        System.out.println(response.body());
    })
    .join();`
    ,
      description: "Java 11+ HttpClient - uses X-API-Key header with sandbox/production key",
    },
    {
      language: "PHP",
      code: `<?php

$apiKey = "gnet_sandbox_YOUR_SANDBOX_KEY";
// for production: $apiKey = "gnet_live_YOUR_PRODUCTION_KEY";

$url = "https://api.yourschool.com/api/schools/:schoolId/students?limit=10";

$options = [
    "http" => [
        "method" => "GET",
        "header" => "X-API-Key: " . $apiKey . "\r\n" .
                    "Content-Type: application/json\r\n",
    ],
];

$context = stream_context_create($options);
$result = file_get_contents($url, false, $context);
print_r(json_decode($result, true));`
    ,
      description: "PHP file_get_contents with context - sandbox key: gnet_sandbox_*, production: gnet_live_*",
    },
    {
      language: "Go",
      code: `package main

import (
    "fmt"
    "net/http"
    "encoding/json"
)

func main() {
    apiKey := "gnet_sandbox_YOUR_SANDBOX_KEY"
    // for production: apiKey := "gnet_live_YOUR_PRODUCTION_KEY"

    url := "https://api.yourschool.com/api/schools/:schoolId/students?limit=10"

    req, err := http.NewRequest("GET", url, nil)
    if err != nil {
        fmt.Println("Error creating request:", err)
        return
    }
    req.Header.Set("X-API-Key", apiKey)
    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        fmt.Println("Error making request:", err)
        return
    }
    defer resp.Body.Close()

    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    fmt.Printf("%+v\\n", result)
}`
    ,
      description: "Go net/http - X-API-Key header with sandbox/production key support",
    },
    {
      language: "Ruby",
      code: `require "net/http"
require "json"

api_key = "gnet_sandbox_YOUR_SANDBOX_KEY"
# for production: api_key = "gnet_live_YOUR_PRODUCTION_KEY"

url = URI("https://api.yourschool.com/api/schools/:schoolId/students?limit=10")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true if url.scheme == "https"

request = Net::HTTP::Get.new(url)
request["X-API-Key"] = api_key
request["Content-Type"] = "application/json"

response = http.request(request)
puts JSON.parse(response.body)`
    ,
      description: "Ruby Net::HTTP - sandbox key prefix: gnet_sandbox_, production: gnet_live_",
    },
  ];

  return (
    <div className="space-y-4">
      {examples.map((example) => (
        <div
          key={example.language}
          className="rounded-2xl sm:rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5 transition-all min-w-0 SMS_SHADOW_SURFACE"
        >
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-xs font-bold text-slate-600">{example.language}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(example.code);
                const btn = event.currentTarget as HTMLButtonElement;
                btn.innerHTML = `<Check className="w-3.5 h-3.5 text-emerald-600" />`;
                setTimeout(() => {
                  btn.innerHTML = `<Copy className="w-3.5 h-3.5" />`;
                }, 2000);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors min-h-8"
            >
              <Copy className="w-3.5 h-3.5" />
              {t("apiDocs.copy")}
            </button>
          </div>
          <pre className="bg-slate-950 rounded-xl p-3 text-xs font-mono text-slate-100 break-all overflow-x-auto">{example.code}</pre>
          <p className="text-xs text-slate-500 leading-relaxed">{example.description}</p>
        </div>
      ))}
    </div>
  );
}