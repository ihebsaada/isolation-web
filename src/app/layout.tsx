import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata = {title:'Isolation résidentielle | Demco',description:'Parlez-nous de votre maison et de votre projet d’isolation. Une demande en quelques étapes, avec vérification de votre secteur.',robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="fr-CA"><body>{children}</body></html>; }
