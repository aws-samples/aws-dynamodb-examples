'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import css from './page.module.css';

export default function LeftNav(props) {
    const folders = props['folders'];
    const pathname = usePathname();
    let activeFolder = null;
    if(pathname.slice(0,5) === '/exp/') {
        activeFolder = pathname.slice(5);
    }
    const uniqueFolders = [...new Set(folders)].reverse();

    let prev;
    let next;
  
    uniqueFolders.forEach((folder, index) => {
        if(folder === activeFolder) {
            if(index > 0) {
                prev = uniqueFolders[index - 1];
            } else {
                prev = uniqueFolders[uniqueFolders.length - 1];
            }
            if(index < uniqueFolders.length - 1) {
                next = uniqueFolders[index + 1];
            } else {
                next = uniqueFolders[0];
            }
        } 
        if (index === 0 && activeFolder === null) {
            prev = uniqueFolders[0];
            next = uniqueFolders[0];
        }
    });

    const prevNext = (<div className={css.prevNext}>
        <Link href={"/exp/" + prev}><span >⏪</span></Link>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        <Link href={"/exp/" + next}><span >⏩</span></Link>

    </div>);

    return(
    <div className={css.leftNavDiv}>
        Experiments:
        <br/>
        {prevNext}
        <br/>

        {uniqueFolders.map((folder, index) => {
            return (
            <div key={'folder-' + index} className={activeFolder === folder ? css.leftNavLinkActive :css.leftNavLink}>
                <Link href={"/exp/" + folder}>{folder}</Link>
            </div>
            );
        })}
    </div>
    );

}