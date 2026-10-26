import {createContext,useContext,useState,useEffect} from 'react';
import hindi from './hi.json';
const Context=createContext(null);
export function LanguageProvider({children}) {
 const [language,setLanguage]=useState(()=>localStorage.getItem('portal_language')==='hi'?'hi':'en');
 useEffect(()=>{localStorage.setItem('portal_language',language);document.documentElement.lang=language;},[language]);
 const t=text=>language==='hi'?(hindi[text] || text):text;
 return <Context.Provider value={{language,setLanguage,t}}>{children}</Context.Provider>;
}
export const useLanguage=()=>useContext(Context);
