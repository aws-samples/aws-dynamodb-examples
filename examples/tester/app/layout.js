const crypto = require('crypto');

import css from './page.module.css';
import {writeFile} from './lib/files.js';

import {getCallerIdentity, listFolders} from './lib/aws.js';

import Link from 'next/link';
import LeftNav from './LeftNav.js';

import config from '@/config.json';
let currentConfig = JSON.parse(JSON.stringify(config));

const myCI = await getCallerIdentity();
const awsAccountId = myCI?.Arn.split(':')[4];
const awsUser = myCI?.Arn.split(':')[5];
let acctHash = crypto.createHash('md5').update(awsAccountId).digest('hex').substring(0,10);

if (currentConfig['bucketName'] === 'tester-data') { // default upon clone

  currentConfig['bucketName'] = 'tester-' + acctHash; 

  await writeFile('config.json', JSON.stringify(currentConfig, null, 2));
}

let bucketName = currentConfig['bucketName'];

export const metadata = {
  title: "Tester",
  description: "Database Test Results Dashboard",
};

export const revalidate = 0;


export default async function RootLayout({ children }) {

  // const myCI = await getCallerIdentity();
  // const awsAccountId = myCI?.Arn.split(':')[4];
  // const awsUser = myCI?.Arn.split(':')[5];

  // let acctHash = crypto.createHash('md5').update(awsAccountId).digest('hex').substring(0,10);

  const folderList = await listFolders(bucketName);
  let FolderListPanel;

  if ('error' in folderList) {
    if(folderList.error === 'NoSuchBucket') {
      FolderListPanel = (<div><div className={css.error}>{folderList.error}<br/>{bucketName}</div><br/><br/>Update the bucket in <br/> /<b>config.json</b> and restart.</div>);
    } else if (folderList.error === 'AccessDenied') {
      FolderListPanel = (<div><div className={css.error}>{folderList.error}<br/>s3://{bucketName}</div></div>);
 
    } else {
      FolderListPanel = (<div>Error: {folderList.error}</div>);
    }

  } else {

    if(folderList.length === 0) {
      FolderListPanel = (<div className={css.info}><br/>&nbsp;</div>); 
    } else {
      FolderListPanel = (<LeftNav folders={folderList}/>);
    }
    
  }

  return (
    <html lang="en">

      <body>
        <table className={css.layoutTable}>
          <thead><tr>
            <th colSpan='2'> 
              <Link href="/">tester</Link> &nbsp;&nbsp;&nbsp;
              <span>{'s3://' + bucketName + '/exp/'}</span>
              <br/>
              <span>{awsAccountId + ':' + awsUser }</span>
              </th>
            </tr></thead>
          <tbody>
            <tr>
              <td className={css.leftNavCell}>
                {FolderListPanel}
              </td>
              <td>
                  {children}
              </td>
            </tr>

          </tbody>
        </table>
        
      </body>
    </html>
  );
}
