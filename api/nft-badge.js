import { kv } from '@vercel/kv';
import fetch from 'node-fetch';
import { generateNFTSVG } from './lib/svgGenerator.js'; // 确保路径正确

const refreshInterval = parseInt(process.env.REFRESH_INTERVAL || '300', 10);
const namespace = process.env.KV_NAMESPACE || 'nftCache';
const openseaToken = process.env.OPENSEA_API_KEY;
const openseaBaseUrl = 'https://api.opensea.io/api/v2/chain/ethereum/account';

/**
 * 获取 NFT 数据
 * @param {string} address 钱包地址
 * @param {number} count 获取的 NFT 数量
 * @returns {Promise<Array>} NFT 列表
 */
async function fetchNFTs(address, count = 9) {
  try {
    count = Math.min(count, 50); // 限制最大值 50
    const url = `${openseaBaseUrl}/${address}/nfts?limit=${count}`;

    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'x-api-key': openseaToken,
      },
    });

    if (!response.ok) {
      console.error(`Error fetching NFTs for ${address}:`, response.statusText);
      return null;
    }

    const data = await response.json();
    return data.nfts || [];
  } catch (error) {
    console.error(`Failed to fetch NFTs for ${address}:`, error);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // 解析 URL 路径参数
    const { address } = req.query;
    const count = parseInt(req.query.count || '10', 10);

    if (!address) {
      return res.status(400).json({ error: '地址参数缺失' });
    }

    const cacheKey = `${namespace}:${address}`;

    let cacheData = await kv.get(cacheKey);
    if (cacheData) {
      try {
        cacheData = cacheData;
      } catch (e) {
        console.error(`Invalid JSON in cache for ${address}, resetting...`);
        cacheData = null;
      }
    }

    const currentTime = Math.floor(Date.now() / 1000);
    let nftList = [];

    // 只有当缓存不存在或过期时才请求 OpenSea API
    if (!cacheData || currentTime > cacheData.exptime) {
      console.log(`Fetching new NFTs for ${address}...`);
      nftList = await fetchNFTs(address, count);

      if (!nftList) {
        return res.status(500).json({ error: '无法获取 NFT 数据' });
      }

      const newCacheData = {
        exptime: currentTime + refreshInterval, // 记录过期时间
        nfts: nftList,
      };

      // 存入 KV
      await kv.set(cacheKey, JSON.stringify(newCacheData));
    } else {
      console.log(`Using cached NFTs for ${address}.`);
      nftList = cacheData.nfts;
    }

    const svg = await generateNFTSVG(nftList, count);
    // console.log("svg",svg)

    res.setHeader('Content-Type', 'image/svg+xml');
    res.status(200).send(svg);
  } catch (error) {
    console.error('生成 NFT SVG 出错:', error);
    res.status(500).json({ error: '服务器错误' });
  }
}