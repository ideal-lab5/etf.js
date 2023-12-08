import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { useEffect } from 'react';

import chainspec from '../public/etfTestSpecRaw.json';
import { Etf } from '@driemworks/etf.js';

export default function Home() {

  useEffect(() => {
    const setup = async () => {
      let api = new Etf('wss://etf1.idealabs.network:443');
      await api.init(chainspec);
    };
    setup();
  }, []);

  return (
    <div>
      This is a test
    </div>
  );
}
