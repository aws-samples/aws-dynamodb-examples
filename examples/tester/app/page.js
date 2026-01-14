import Image from 'next/image';

import css from './page.module.css';

import config from '../config.json' with { type: 'json' };

const bucketName = config['bucketName'];

export default async function Home() {

  return (
    <div className={css.canvas}>
      <main className={css.main}>
        <span className={css.welcomeMsg}>Welcome to tester!</span>


          <p>Tester is a simple experiment management tool.</p>
          <p>Run a job, then refresh this page to see your new results folder on the left.</p>


          <p>Project & instructions at :&nbsp; 
            <b><i><a href="https://github.com/robm26/tester" target='_blank'>
            github.com/robm26/tester
            </a></i></b>
          </p>
          
          <Image
            src="/tester_s02.png"
            priority={true}
            width={600}
            height={390}
            alt="tester splash image"
          />

      </main>
      <footer className={null}> 
      </footer>
    </div>
  );
}
