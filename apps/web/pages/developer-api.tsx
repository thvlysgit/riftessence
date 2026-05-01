import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function DeveloperApiPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Head>
        <title>Developer API • RiftEssence</title>
        <meta name="description" content="Developer API for accessing RiftEssence Duo and LFT feeds" />
      </Head>

      <h1 className="text-3xl font-bold mb-4">Developer API</h1>

      <p className="mb-4 text-sm text-gray-700">Access live Duo and LFT posts programmatically. To request an API key, you must be logged in to RiftEssence. Visit the API request endpoint or open a support ticket if you need help.</p>

      <div className="border rounded-lg p-6 bg-white">
        <h2 className="text-xl font-semibold mb-2">Getting started</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
          <li>Log in to RiftEssence.</li>
          <li>Submit an API access request via <code className="px-1 py-0 rounded bg-gray-100">POST /api/developer-api/requests</code>.</li>
          <li>Use the issued key to call the public feed endpoints:</li>
          <ul className="list-disc list-inside ml-6">
            <li><code>/api/developer-api/duo/posts</code></li>
            <li><code>/api/developer-api/lft/posts</code></li>
          </ul>
        </ol>

        <div className="mt-4 text-sm text-gray-600">For full specs and filters see the backend docs in the project repository.</div>
        <div className="mt-6">
          <Link href="/admin/developer-api" className="text-blue-600 hover:underline">Admin dashboard (admins only)</Link>
        </div>
      </div>
    </div>
  );
}
