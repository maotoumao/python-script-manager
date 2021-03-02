import {ipcRenderer, remote} from 'electron';
import React, { useEffect } from 'react';
import {Button, Form, Input} from 'antd';
import path from 'path';

import store from '../../store/index';

function Setting(){

    const onSaveClick = (values: any) => {
        for(let key in values){
            if(values[key] === void 0){
                store.delete(key);
            } else {
                store.set(key, path.normalize(values[key]));
            }
        }
        
        ipcRenderer.invoke('close-setting-window');
        new remote.Notification({
            title: '脚本管理器',
            body: '配置保存成功'
        }).show();
    }

    useEffect(() => {
        console.log(store.get('scriptsPath'))
    }, [])

    return (
        <div className='settings-wrapper'>
            <Form layout='horizontal' labelCol={{span: 5}} wrapperCol={{span: 15}} onFinish={onSaveClick} initialValues={{
                pythonPath: store.get('pythonPath'),
                scriptsPath: store.get('scriptsPath')
            }}
            >
                <Form.Item name='pythonPath' label='Python路径'>
                    <Input placeholder='默认路径'></Input>
                </Form.Item>
                <Form.Item name='scriptsPath' label='脚本存储路径'>
                    <Input placeholder='默认路径'></Input>
                </Form.Item>

                <Form.Item>
                    <Button style={{width: '100%'}} type='primary' htmlType='submit'>保存</Button>
                </Form.Item>

            </Form>
        </div>
    );
}

export default Setting;