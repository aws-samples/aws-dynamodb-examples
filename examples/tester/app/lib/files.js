import * as fs from 'node:fs/promises';

const writeFile = async (fileName, fileContent) => {
    
    try {
        await fs.writeFile( fileName, fileContent, 'utf-8' );
        return 'ok';

    } catch (err) {
        console.log(err);
        return err;
    }

}

export {writeFile};

