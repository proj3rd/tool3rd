import { Button, Checkbox, Form, Input, InputNumber, Modal, ModalProps, Select, Typography } from "antd";
import { useForm } from "antd/lib/form/Form";
import Store from "electron-store";
import { isEqual } from "lodash";
import React, { useEffect, useState } from "react";
import { ipcRenderer } from "electron";
import { CHAN_APP_EXIT, CHAN_APP_RELAUNCH, CHAN_BROWSE_CERTIFICATE } from "../types";

const { Option } = Select;

type Props = {} & ModalProps;

export default function ModalSettings({ ...modalProps }: Props) {
  const store = new Store();
  const { visible } = modalProps;

  const [formSettings] = useForm();

  const [settingsChanged, setSettingsChanged] = useState(false);

  useEffect(() => {
    formSettings.setFieldsValue(store.store);
  }, [visible]);

  function applyAndRelaunch() {
    store.set(formSettings.getFieldsValue());
    ipcRenderer.send(CHAN_APP_RELAUNCH);
    ipcRenderer.send(CHAN_APP_EXIT);
  }

  function checkSettingsChanged() {
    const { proxy, security } = store.store;
    const { proxy: proxyNew, security: securityNew } = formSettings.getFieldsValue();
    const settingsChanged = !isEqual(proxy, proxyNew) || !isEqual(security, securityNew);
    setSettingsChanged(settingsChanged);
  }

  function onClickBrowse() {
    ipcRenderer.invoke(CHAN_BROWSE_CERTIFICATE).then((openDialogReturnValue: Electron.OpenDialogReturnValue) => {
      const { canceled, filePaths } = openDialogReturnValue;
      if (canceled || !filePaths.length) {
        return;
      }
      const certPath = filePaths[0];
      formSettings.setFieldsValue({
        security: {
          cert: certPath,
        },
      });
      onValuesChange();
    }).catch((reason) => {
      console.error(reason);
    });
  }

  function onValuesChange() {
    checkSettingsChanged();
  }

  return (
    <Modal
      title='Settings'
      {...modalProps}
      footer={
        <Button
          onClick={applyAndRelaunch}
          disabled={!settingsChanged}
          type="primary"
        >
          Apply & relaunch
        </Button>
      }
      width={640}
    >
      <Form
        name='settings' form={formSettings}
        onValuesChange={onValuesChange}
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
      >
        <Typography.Text strong>Proxy</Typography.Text>
        <Form.Item
          name={['proxy', 'use']} label='Use'
          valuePropName='checked'
        >
          <Checkbox />
        </Form.Item>
        <Form.Item label='HTTPS proxy'>
          <Input.Group compact>
            <Form.Item name={['proxy', 'https', 'protocol']}>
              <Select placeholder='Protocol' style={{ minWidth: '100px'}}>
                <Option key='http' value='http'>http://</Option>
                <Option key='https' value='https'>https://</Option>
              </Select>
            </Form.Item>
            <Form.Item name={['proxy', 'https', 'host']}>
              <Input placeholder='Host' />
            </Form.Item>
            <Form.Item name={['proxy', 'https', 'port']}>
              <InputNumber
                placeholder='Port'
                min={1} max={65535}
              />
            </Form.Item>
          </Input.Group>
        </Form.Item>
        <Typography.Text strong>Security</Typography.Text>
        <Form.Item
          label='Certificate'
          tooltip={
            <>
              If you are behind a proxy, you may want to set a self-signed certificate.
            </>
          }
        >
          <Input.Group compact>
            <Form.Item name={['security', 'cert']}>
              <Input />
            </Form.Item>
            <Form.Item>
              <Button onClick={onClickBrowse}>Browse...</Button>
            </Form.Item>
          </Input.Group>
        </Form.Item>
        <Form.Item
          name={['security', 'rejectUnauthorized']} label='Verify CA'
          valuePropName='checked'
          tooltip={
            <>
              Whether to verify SSL certificate.
              If you have a trouble with using a self-signed certificate, uncheck it.
              However, it may expose a potential security risk and
              tool3rd recommends you to set a self-signed certificate, if applicable.
            </>
          }
        >
          <Checkbox />
        </Form.Item>
      </Form>
    </Modal>
  );
}
