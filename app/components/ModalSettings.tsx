import { Button, Form, Modal, ModalProps } from "antd";
import { useForm } from "antd/lib/form/Form";
import TextArea from "antd/lib/input/TextArea";
import * as remote from '@electron/remote';
import Store from "electron-store";
import { isEqual } from "lodash";
import React, { useEffect, useState } from "react";

type Props = {} & ModalProps;

export default function ModalSettings({ ...modalProps }: Props) {
  const store = new Store();
  const { visible } = modalProps;

  const [formSettings] = useForm();

  const [settingsChanged, setSettingsChanged] = useState(false);

  useEffect(() => {
    formSettings.setFieldsValue({
      settings: JSON.stringify(store.store, null, 4),
    });
  }, [visible]);

  function applyAndRelaunch() {
    store.set(JSON.parse(formSettings.getFieldValue('settings')));
    remote.app.relaunch();
    remote.app.exit();
  }

  function checkSettingsChanged() {
    const settingsNew = formSettings.getFieldValue('settings');
    try {
      setSettingsChanged(!isEqual(store.store, JSON.parse(settingsNew)));
    } catch (e) {
      console.error(e);
      console.log('settingsChanged remains', settingsChanged);
    }
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
    >
      <Form
        name='settings' form={formSettings}
        onValuesChange={onValuesChange}
      >
        <Form.Item name='settings'>
          <TextArea autoSize={true} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
