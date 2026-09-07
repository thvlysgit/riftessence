import { GetServerSideProps } from 'next';
export const getServerSideProps: GetServerSideProps = async () => ({ redirect: { destination: '/advertise', permanent: false } });
export default function LegacyRedirect() { return null; }
