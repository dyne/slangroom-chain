// SPDX-FileCopyrightText: 2021-2025 Dyne.org foundation
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import fs from 'fs/promises';

export const readFromFile = async (path: string): Promise<string> => {
  const data = await fs.readFile(path, 'utf-8');
  return data;
};
