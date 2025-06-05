// SPDX-FileCopyrightText: 2021-2025 Dyne.org
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Slangroom, type Slangroom as SlangroomType } from '@slangroom/core';
import { db } from '@slangroom/db';
import { ethereum } from '@slangroom/ethereum';
import { fs } from '@slangroom/fs';
import { git } from '@slangroom/git';
import { helpers } from '@slangroom/helpers';
import { http } from '@slangroom/http';
import { JSONSchema } from '@slangroom/json-schema';
import { oauth } from '@slangroom/oauth';
import { pocketbase } from '@slangroom/pocketbase';
import { qrcode } from '@slangroom/qrcode';
import { redis } from '@slangroom/redis';
import { shell } from '@slangroom/shell';
import { timestamp } from '@slangroom/timestamp';
import { wallet } from '@slangroom/wallet';
import { zencode } from '@slangroom/zencode';

const SLANGROOM_PLUGINS = [
  db,
  ethereum,
  fs,
  git,
  helpers,
  http,
  JSONSchema,
  oauth,
  pocketbase,
  qrcode,
  redis,
  shell,
  timestamp,
  wallet,
  zencode,
];

export class SlangroomManager {
  private static instance: SlangroomType;

  //  private constructor() {}

  public static getInstance(): SlangroomType {
    if (!this.instance) {
      this.instance = new Slangroom(SLANGROOM_PLUGINS);
    }
    return this.instance;
  }

  public static async executeInstance(
    zencode: string,
    data: string,
    keys: string,
    conf: string | undefined,
  ): Promise<{ result: Record<string, unknown>; logs: string }> {
    const s = this.getInstance();
    const res = await s.execute(zencode, {
      data: JSON.parse(data),
      keys: JSON.parse(keys),
      conf,
    });
    return res;
  }
}
