const crypto = require('crypto');

import css from './page.module.css';
import {writeFile} from './lib/files.js';

import {getCallerIdentity, listFolders} from './lib/aws.js';

import Link from 'next/link';
import LeftNav from './LeftNav.js';

const myCI = await getCallerIdentity();
const awsAccountId = myCI?.Arn.split(':')[4];
const awsUser = myCI?.Arn.split(':')[5];
// let acctHash = crypto.createHash('md5').update(awsAccountId).digest('hex').substring(0,10);

let bucketName = process.env.TESTER_BUCKET;

export const metadata = {
  title: "Tester",
  description: "Database Test Results Dashboard",
};

export const revalidate = 0;


export default async function RootLayout({ children }) {


  const folderList = await listFolders(bucketName);
  let FolderListPanel;

  if ('error' in folderList) {
    if(folderList.error === 'NoSuchBucket') {
      FolderListPanel = (<div><div className={css.error}>{folderList.error}<br/>{bucketName}</div><br/><br/>Update the bucket in <br/> /<b>.env</b> and restart.</div>);
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
