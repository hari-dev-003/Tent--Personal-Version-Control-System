#!/usr/bin/env node


import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import {diffLines} from 'diff';
import chalk from 'chalk';
import {Command} from 'commander';

const program = new Command();

class Tent{

    constructor(repoPath = "."){
        this.repoPath = path.join(repoPath, '.tent');
        this.objectsPath = path.join(this.repoPath, 'objects');
        this.headPath = path.join(this.repoPath, 'HEAD');
        this.indexPath = path.join(this.repoPath, 'index');
    }

    async init(){
        // Creates .tent directory structure which is similar to .git (repository)
        await fs.mkdir(this.objectsPath, { recursive: true });

        try{
            //Create HEAD and index file only if they don't exist
            await fs.writeFile(this.headPath,"",{flag:'wx'});

            await fs.writeFile(this.indexPath,JSON.stringify([]),{flag:'wx'});
        }
        catch(e){
            // console.log("Repository already initialized.");
        }
    }

    static async create(repoPath = "."){
        const tent = new Tent(repoPath);
        await tent.init();
        return tent;
    }

    hashObject(data){
        //hashing the data using sha1 algorithm
        // Here contents in the files also hashed and commit data also hashed. 
        return crypto.createHash('sha1').update(data,'utf-8').digest('hex');
    }

    async add(filePath){
        // Reads the added file content
        const fileData = await fs.readFile(filePath, { encoding:'utf-8'});

        // Hash the file content 
        const fileHash = this.hashObject(fileData);
        console.log(` ${fileHash}`);

        //Now creates a new file with given hashname in objects directory
        const hashedObjectPath = path.join(this.objectsPath, fileHash);

        //Write the file content to the new file in objects directory
        await fs.writeFile(hashedObjectPath,fileData);

        //calls the staging area update function to update the index file
        await this.updateStagingArea(filePath, fileHash);
        console.log(`Added file: ${filePath}`);
    }

    async updateStagingArea(filePath, fileHash){
        //read current staging area (index) and convert to json
        const index = JSON.parse( await fs.readFile(this.indexPath, {encoding:'utf-8'}));
        //now add the newly changed files to the staging area when called "add"
        index.push({path:filePath, hash:fileHash});
        // Then write back the updated staging area to the index file
        await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2));
        console.log(`Updated staging area with file: ${filePath}`);
    }

    async commit(message){
        const index = JSON.parse( await fs.readFile(this.indexPath,{encoding:'utf-8'}));
        const parentCommit = await this.getCurrentHead();

        const commitData = {
            message,
            parent: parentCommit || null,
            timestamp: new Date().toISOString(),
            files: index
        };

        const commitHash = this.hashObject(JSON.stringify(commitData)); //here hashing the commit data also because commit hash keeps changing even if the files are same but commit message or timestamp changes
        //in git every commit also stored as objects in the objects folder. 
        const commitPath = path.join(this.objectsPath,commitHash);
        await fs.writeFile(commitPath, JSON.stringify(commitData));

        await fs.writeFile(this.headPath, commitHash); //updating head to point to new commit
        await fs.writeFile(this.indexPath, JSON.stringify([])); //clearing staging area

        console.log(`Committed Successfully: ${commitHash}`);
    }

    async getCurrentHead(){
        try{
            return await fs.readFile(this.headPath,{encoding:'utf-8'});
        }
        catch(e){
            return null;
        }
    }

    async log(){
        let currentCommit = await this.getCurrentHead();
        while (currentCommit){
            const commitData = JSON.parse(await fs.readFile(path.join(this.objectsPath,currentCommit),{encoding:'utf-8'}));
            console.log(`\nCommit: ${currentCommit}`);
            console.log(`Message: ${commitData.message}`);
            console.log(`Timestamp: ${commitData.timestamp}`);
            console.log('Files:');
            commitData.files.forEach(file => {
                console.log(` - ${file.path} (${file.hash})`);
            });
            console.log('-----------------------\n');
            currentCommit = commitData.parent;
        }
    }

    async showCommitDiff (commitHash){
        const commitData = await this.getCommitData(commitHash);
        if(!commitData){
            console.log(`Commit with hash ${commitHash} not found.`);
            return;
        }
        console.log(`Changes in the last commit are:`);

        for(const file of commitData.files){
            const fileContent = await fs.readFile(path.join(this.objectsPath,file.hash),{encoding:'utf-8'});//getting current file content

            console.log(`\nFile: ${file.path}\nContent:\n${fileContent}`);
            console.log('-----------------------\n');

            if(commitData.parent){
                const parentCommitData = await this.getCommitData(commitData.parent);
                const parentFile = parentCommitData.files.find(f => f.path === file.path);

                if(parentFile !== undefined){
                    const parentFileContent = await fs.readFile(path.join(this.objectsPath,parentFile.hash),{encoding:'utf-8'});//getting parent file content
                    console.log(`\nDiff: `)
                    const diff = diffLines(parentFileContent, fileContent);

                    diff.forEach(part => {
                        if(part.added){
                            process.stdout.write(chalk.green("++" + part.value));
                        }
                        else if(part.removed){
                            process.stdout.write(chalk.red("--" +part.value));
                        }
                        else{
                            process.stdout.write(chalk.gray(part.value));
                        }
                    });
                    console.log('\n-----------------------\n');
                }
                else{
                    console.log(`File ${file.path} is new in this commit.`);
                }
            }
            else{
                console.log(`This is the first commit, no previous version to compare.`);
            }
        }
    }

    async getCommitData (commitHash){
        return JSON.parse( await fs.readFile(path.join(this.objectsPath,commitHash),{encoding:'utf-8'}));
    }

}

// Normal approach without CLI handling
// (async () => {
//     const tent = await Tent.create();
//     // await tent.add('test.txt');
//     // await tent.commit('Second commit message');

//     // await tent.log();
//     await tent.showCommitDiff('4c8f60ee62f8206845e81741c30f9d24893b5461');
// })();

// CLI handling using commander

program.command('init').action(async ()=>{
    const tent = await Tent.create();
})

program.command('add <filePath>').action(async (filePath)=>{
    const tent = await Tent.create();
    await tent.add(filePath);
})

program.command('commit <message>').action(async (message)=>{
    const tent = await Tent.create();
    await tent.commit(message);

})

program.command('log').action(async ()=>{
    const tent = await Tent.create();
    await tent.log();
})

program.command('diff <commitHash>').action(async (commitHash)=>{
    const tent = await Tent.create();
    await tent.showCommitDiff(commitHash);
})

program.parse(process.argv)