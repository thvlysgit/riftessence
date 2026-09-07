import { GetServerSideProps } from 'next';
export const getServerSideProps: GetServerSideProps = async () => ({ redirect: { destination: '/games', permanent: false } });
export default function LegacyRedirect() { return null; }
