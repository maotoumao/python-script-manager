import { Divider, Empty, message, Popover, InputNumber, Modal, List } from "antd";
import { spawn } from "child_process";
import { remote } from "electron";
import path from "path";
import React, { useState, useEffect } from "react";
import { v4 } from "uuid";

import store from '../../store';
import FS from 'fs';
import { PauseCircleTwoTone, PlayCircleTwoTone, SettingTwoTone } from "@ant-design/icons";
import { ipcRenderer } from "electron";
import cloneDeep from 'lodash.clonedeep';

const fs = FS.promises;

function ScriptsDashboard() {
    const [scripts, setScripts] = useState<any[]>([]);
    const [running, setRunning] = useState<any>(null);
    const [scriptSetting, setScriptSetting] = useState<any>({})
    const [log, setLog] = useState<any[]>([]);
  
    const loadScripts = async (scriptsPath: any) => {
        const scriptsInfo = [];
        try{
            const scriptsStat = await fs.stat(scriptsPath);
            if(!scriptsStat.isDirectory()){
                throw new Error();
            }
        }
        catch(e){
            fs.mkdir(scriptsPath);
        }

        const scripts = await fs.readdir(scriptsPath);
        for(let script of scripts){
          const scriptStat = await fs.stat(path.join(scriptsPath, script));
          if(scriptStat.isDirectory()){
            try {
              const config = remote.require(path.join(scriptsPath, script, 'script.json'));
              config.entry = path.join(scriptsPath, script, 'index.py')
              config.baseDir = path.join(scriptsPath, script);
              config.uuid = v4();
              scriptsInfo.push(config);
            } catch (error) {
              console.log('err', error)
            }
          }
        }
        return scriptsInfo;
    }
  
  
    useEffect(() => {
      // 第一次加载的时候，读取所有的脚本
      const scriptsPath = store.get('scriptsPath', path.join(remote.app.getAppPath(), 'scripts'));
      // 初始化事件
      ipcRenderer.on('refresh', () => {
        setRunning((running: any) => {
          if(running){
            running.process.kill();
          }
          return null;
        })
        location.reload();
      })
    
      
      loadScripts(scriptsPath).then((scriptsInfo) => {
        setScripts(scriptsInfo);
      });
      
    }, [])
  
    const onScriptStart = (script: any) => {
      if(running){
        message.warning(`当前${running.name}正在执行，请先关闭`);
        return;
      }
      setLog([]);
      const process = spawn(store.get('pythonPath') as string || 'python', [
        script.entry,
        ...(script.args?.map((arg: any) => arg.value))
      ]);
      process.stdout.on('data', (data) => {
          setLog((log) => ([...log, data.toString('utf8').trim()].slice(-5)))
      });
      process.stderr.on('data', () => {
        new remote.Notification({
            title: '脚本管理器',
            body: `运行出错，请检查脚本逻辑`
        }).show();
        process.kill();
        setRunning(null);
      });
      process.on('error', () => {
        new remote.Notification({
            title: '脚本管理器',
            body: `脚本异常`
        }).show();
        process.kill();
        setRunning(null);
      });
      process.on('exit', (code) => {
          if(code === 0){
            setRunning((running: any) => {
              new remote.Notification({
                  title: '脚本管理器',
                  body: `任务${running?.name}已完成`
              }).show();
              return null;
            });
          }
      })
  
      setRunning({
        ...script,
        process
      })
  
    }

    

    // useEffect(() => {
    //   console.log('rrrr', running)
    // }, [running])
    const onScriptStop = () => {
      if(running){
        running.process.kill();
        setRunning(null);
      }
    }

    const onModalArgChange = (index:number, e:any) => {
        scriptSetting.args[index].value = e;
        setScriptSetting({
            ...scriptSetting, 
        })
    }

    const onSettingClick = (script: any) => {
        if(script.uuid !== running?.uuid){
            setScriptSetting({
                args: cloneDeep(script?.args),
                title: script.name,
                uuid: script.uuid,
                visible: true
            })
        } else {
            message.info('正在执行脚本，无法设置')
        }
        
    }

    const onModalOk = async () => {
        let ts = scripts.find(script => script.uuid === scriptSetting.uuid);
        if(!ts){
          setScriptSetting({});
          return;
        }
        ts.args = scriptSetting.args;
        const config = JSON.stringify({
            name: ts.name,
            description: ts.description,
            args: ts.args
        }, null, 4)
        await fs.writeFile(path.join(ts.baseDir, 'script.json'), config);
        setScripts([
            ...scripts
        ])
        setScriptSetting({});
        message.success('修改成功')


    }
    const onModalCancel = () => {
        setScriptSetting({});
    }
  
    return (
      <div className='body-wrapper'>
        {
            scripts.length === 0 && <Empty description='未发现脚本'></Empty>
        }
        {
          scripts.map((script: any, index: number) => (
            <div key={script.uuid}>
              {index > 0 && <Divider style={{margin: 0}}></Divider>}
              <div className='list-item'>
                  <div className='list-item-prev'>
                    {index + 1}
                  </div>
                  <div className='list-item-content'>
                    <span className='list-item-title'>
                    {
                          script.uuid === running?.uuid ? (
                            <Popover title={'状态'} content={<List size='small' dataSource={log} renderItem={item => <List.Item>{item}</List.Item>}></List>}>
                                {script.name}
                            </Popover>
                          ) : script.name
                    }
                        
                    </span>
                    <span className='list-item-description' >
                      <Popover content={script.description}>
                        {script.description}
                      </Popover>
                    </span>
                  </div>
                  <div className='list-item-tail'>
                    { script.uuid === running?.uuid ? <PauseCircleTwoTone twoToneColor="#eb2f96" onClick={onScriptStop}/> : <PlayCircleTwoTone twoToneColor="#52c41a" onClick={onScriptStart.bind(null, script)}/>}
                    { script.args && <SettingTwoTone twoToneColor="#7849a3" onClick={onSettingClick.bind(null, script)} />}
                  </div>
              </div>
            </div>
          ))
        }
        <Modal title={scriptSetting?.title} visible={scriptSetting?.visible} okText='保存' cancelText='取消' onOk={onModalOk} onCancel={onModalCancel}>
            {
                scriptSetting?.args?.map((arg:any, index: number) => (
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '5px 5px'}}>
                {
                    arg.name
                }
                <InputNumber onChange={onModalArgChange.bind(null, index)} value={arg.value}></InputNumber>
            </div>
            ))}
        </Modal>
      </div>
    );
  }
  
  export default ScriptsDashboard;