"use strict";

const assert = require('assert');
const _ = require('underscore');
const diffTools = require('../../lib/util/diffTools.js');

assert.equalArray = function(a1, a2){
    if(!compareArray(a1, a2)){
        throw new Error('Array is different: ' + JSON.stringify(a1) + ' <=> ' + JSON.stringify(a2));
    }
    return true;
};

assert.notEqualArray = function(a1, a2){
    if(compareArray(a1, a2)){
        throw new Error('Array is same, want different: ' + JSON.stringify(a1) );
    }
    return true;
}



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// prevent hightlight warnings
// let describe = describe || null;
// let it = it || null;

describe('Diff apply [UNIT]', function () {

    /**
     *
     */
    it('Simple example', function () {
        let diff1 = {
            f1:'v1',
            f2:'v2',
            f4:'v4'
        };

        let doc1 = {
            f1:'v1',
            f2:'v2',
            f3:'v3'
        };
        var merge = diffTools.apply(diff1, doc1);

        assert.equal(merge.f1, 'v1');
        assert.equal(merge.f2, 'v2');
        assert.equal(merge.f3, 'v3');
        assert.equal(merge.f4, 'v4');
    });



    it('Nullable example', function () {
        let diff1 = {
            f1:'v1'
        };

        let doc1 = {
            f1:'v2'
        };

        var merge1 = diffTools.apply(diff1, null);
        assert.equal(merge1.f1, 'v1');

        var merge2 = diffTools.apply(null, doc1);
        assert.equal(merge2.f1, 'v2');

        var merge3 = diffTools.apply(null, null);
        assert.deepEqual(merge3, {} );
    });

    /**
     *
     */
    it('Nested example', function () {
        let diff1 = {
            f1:{
                f11:'v11',
                f12:'v12'
            },
            f3:{
                f31:'v31',
                f32:'v32'
            }
        };

        let doc1 = {
            f1:{
                f11:'v11',
                f12:'v12'
            },
            f2:{
                f21:'v21',
                f22:'v22'
            }
        };
        var merge = diffTools.apply(diff1, doc1);

        assert.equal(merge.f1.f11, 'v11');
        assert.equal(merge.f1.f12, 'v12');
        assert.equal(merge.f2.f21, 'v21');
        assert.equal(merge.f2.f22, 'v22');
        assert.equal(merge.f3.f31, 'v31');
        assert.equal(merge.f3.f32, 'v32');
    });


    /**
     *
     */
    it('Simple overwrite', function () {
        let diff1 = {
            f1:'v1',
            f2:'v2',
            f3:'v3'
        };

        let doc1 = {
            f1:'v11',
            f2:'v22',
            f3:'v33'
        };
        var merge = diffTools.apply(diff1, doc1);

        assert.equal(merge.f1, 'v1');
        assert.equal(merge.f2, 'v2');
        assert.equal(merge.f3, 'v3');
    });

    /**
     *
     */
    it('Nested overwrite', function () {
        let diff1 = {
            f1:{
                f11:'v1',
                f12:'v2'
            },
            f3:{
                f31:'v3',
                f32:'v4'
            }
        };

        let doc1 = {
            f1:{
                f11:'v11',
                f12:'v22'
            },
            f2:{
                f21:'v33',
                f22:'v44'
            }
        };
        var merge = diffTools.apply(diff1, doc1);

        assert.equal(merge.f1.f11, 'v1');
        assert.equal(merge.f1.f12, 'v2');
        assert.equal(merge.f2.f21, 'v33');
        assert.equal(merge.f2.f22, 'v44');
        assert.equal(merge.f3.f31, 'v3');
        assert.equal(merge.f3.f32, 'v4');
    });


    /**
     *
     */
    it('Complex nesting', function () {
        let diff1 = {
            f1:{
                f11:'v1',
                f12:'v2'
            }
        };

        let doc1 = {
            f1:{
                f11:'v3',
                f13:'v4'
            }
        };
        var merge = diffTools.apply(diff1, doc1);

        assert.equal(merge.f1.f11, 'v1');
        assert.equal(merge.f1.f12, 'v2');
        assert.equal(merge.f1.f13, 'v4');
    });



    /**
     *
     */
    it('Very deep nesting (5 levels)', function () {
        let diff1 = {
            f1:{
                f2:{
                    f3:{
                        f4:{
                            f5: 'v1'
                        }
                    }
                }
            },
            b1:{
                b2:{
                    b3:{
                        b4:{
                            b5: 'v2'
                        }
                    }
                }
            }
        };

        let doc1 = {
            f1:{
                f2:{
                    f3:{
                        f4:{
                            f5: 'v3'
                        }
                    }
                }
            },
            b1:{
                b2:{
                    c3:{
                        c4:{
                            c5: 'v4'
                        }
                    }
                }
            }
        };
        var merge = diffTools.apply(diff1, doc1);

        assert.equal(merge.f1.f2.f3.f4.f5, 'v1');
        assert.equal(merge.b1.b2.b3.b4.b5, 'v2');
        assert.equal(merge.b1.b2.c3.c4.c5, 'v4');
    });


    /**
     *
     */
    it('Check object clone', function () {
        let diff1 = {
            f1:'v1',
            f2:'v2',
        };

        let doc1 = {
            f1:'v3',
            f3:'v4'
        };
        var merge = diffTools.apply(diff1, doc1);

        merge.f1 = 'v11';
        merge.f2 = 'v22';
        merge.f3 = 'v33';

        assert.equal(diff1.f1, 'v1');
        assert.equal(diff1.f2, 'v2');
        assert.equal(doc1.f1,  'v3');
        assert.equal(doc1.f3,  'v4');
    });


    /**
     *
     */
    // it('Check array replacement (temp solution)', function () {
    //     let diff1 = {
    //         f1:[1,2,3],
    //         f2:[11,22,33],
    //     };
    //
    //     let doc1 = {
    //         f1:[4,5,6],
    //         f3:[11,22,44]
    //     };
    //     var merge = diffTools.apply(diff1, doc1);
    //
    //     assert.equal(compareArray(merge.f1, [1,2,3]), true);
    // });


    /**
     *
     */
    it('Merge array of objects (concat)', function () {
        let diff1 = {
            f1:[1,2,3],
            f2:[11,22,33],
            f3:[11,22,33]
        };

        let doc1 = {
            f1:[4,5,6],
            f3:[11,22,44],
            f4:[44,55,66]
        };

        var merge1 = diffTools.apply(diff1, doc1, diffTools.resolve.concat);

        assert.equalArray(merge1.f1, [1,2,3, 4,5,6]);
        assert.equalArray(merge1.f2, [11,22,33]);
        assert.equalArray(merge1.f3, [11,22,33, 11,22,44]);
        assert.equalArray(merge1.f4, [44,55,66]);

    });

    /**
     *
     */
    it('Merge array of objects (unique)', function () {
        let diff1 = {
            f1:[1,2,3],
            f2:[11,22,33],
            f3:[11,22,33]
        };

        let doc1 = {
            f1:[4,5,6],
            f3:[11,22,44],
            f4:[44,55,66]
        };

        var merge2 = diffTools.apply(diff1, doc1, diffTools.resolve.unique);


        assert.equalArray(merge2.f1, [1,2,3, 4,5,6]);
        assert.equalArray(merge2.f2, [11,22,33]);
        assert.equalArray(merge2.f3, [11,22,33, 44]);
        assert.equalArray(merge2.f4, [44,55,66]);

    });

    /**
     *
     */
    it('Merge array of objects (custom)', function () {
        let diff1 = {
            f1:[1,2,3],
            f2:[11,22,33],
            f3:[11,22,33]
        };

        let doc1 = {
            // f1:[4,5,6],
            f3:[11,22,44],
            f4:[44,55,66]
        };

        // only one conflict in test!
        var merge = diffTools.apply(diff1, doc1, (doc, patch, path)=>{
            assert.equal(path, 'f3');
            assert.equalArray(patch, [11,22,33]);
            assert.equalArray(doc, [11,22,44]);
            return 'vv3';
        });

        assert.equal(merge.f3, 'vv3');
    });


    /**
     *
     */
    it('Merge array of objects (deepUnique)', function () {
        let diff1 = {
            f1:[
                {a:'a1'},
                {b:'a2'}
            ],
            f2:[
                {a:'a1'},
                {b: [ [1,2,3] ] },
                {c: [ [4,5,6] ] }
            ],

            f3 : [ {a:'b1'} ],
            f4 : [ {a:'b2'} ],
            // f5
            f6 : null,

            f7: [
                {a:'c1'},
                {d:'c4'}
            ],
            f8: [
                {c:'d3'},
                {d:'d4'},
                {e:'e5'}
            ],
            f9: [
                {a:'e1'},
                {b1:'e21'},
                {c1:'e31'},
                {d :'e4'}
            ],
        };


        let doc1 = {
            f1:[
                {a:'a1'},
                {c:'a3'}
            ],
            f2:[
                {b: [ [1,2,3] ] },
                {c: [ [4,5,7] ] }
            ],

            //f3:null
            f4 : null,
            f5 : [ {a:'b3'} ],
            f6 : [ {a:'b4'} ],

            f7: [
                {a:'c1'},
                {b:'c2'},
                {c:'c3'}
            ],
            f8: [
                {a:'d1'},
                {b:'d2'},
                {c:'d3'}
            ],
            f9: [
                {a:'e1'},
                {b2:'e22'},
                {c2:'e32'},
                {d :'e4'}
            ],
        };


        let result = {
            f1:[
                {a:'a1'},
                {c:'a3'},
                {b:'a2'}
            ],
            f2:[
                {a:'a1'},
                {b: [ [1,2,3] ] },
                {c: [ [4,5,7] ] },
                {c: [ [4,5,6] ] }
            ],
            f3 : [ {a:'b1'} ],
            f4 : [ {a:'b2'} ],
            f5 : [ {a:'b3'} ],
            f6 : [ {a:'b4'} ],
            f7: [
                {a:'c1'},
                {b:'c2'},
                {c:'c3'},
                {d:'c4'}
            ],
            f8: [
                {a:'d1'},
                {b:'d2'},
                {c:'d3'},
                {d:'d4'},
                {e:'e5'}
            ],
            f9: [
                {a:'e1'},
                {b2:'e22'},
                {b1:'e21'},
                {c2:'e32'},
                {c1:'e31'},
                {d :'e4'}
            ],
        }

        // only one conflict in test!
        var merge = diffTools.apply(diff1, doc1,  diffTools.resolve.deepUnique);

        assert.deepEqual(merge.f1, result.f1);//, 'simple');
        assert.deepEqual(merge.f2, result.f2);//, 'nested arrays');
        assert.deepEqual(merge.f3, result.f3);//, 'original value not set');
        assert.deepEqual(merge.f4, result.f4);//, 'original null value');
        assert.deepEqual(merge.f5, result.f5);//, 'patch value not set');
        assert.deepEqual(merge.f6, result.f6);//, 'patch null value');
        assert.deepEqual(merge.f7, result.f7); // miss two elements
        assert.deepEqual(merge.f8, result.f8); // one common element
        assert.deepEqual(merge.f9, result.f9); // multiple diff
    });

    /**
     *
     */
    it('Conflict match', function () {
        let diff1 = {
            f1:[1,2,3],
            f2:[11,22,33],
            f3:[11,22,33],
            f10:{
                f11: ['v1'],
                f12: ['v2'],
            }
        };

        let doc1 = {
            f1:[4,5,6],
            f3:[11,22,44],
            f4:[44,55,66],
            f10:{
                f11: ['v2'],
                f13: ['v3'],
            }
        };
        let conflicts = [
            'f1', 'f3', 'f10.f11'
        ];

        var conflictsResult = []
        var merge = diffTools.apply(diff1, doc1, function(a, b, path){
            conflictsResult.push(path);
        });

        assert.equalArray(conflictsResult, conflicts);

    });






});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

describe('Diff get [UNIT]', function () {



    /**
     *
     */
    it('Value changed', function () {
        let oldDoc = {
            f1:{
                b1: 'v1',
                b2: 'v2'
            },
            f2:{
                b1: 'v3',
                b2: 'v4'
            }
        };

        let newDoc = {
            f1:{
                b1: 'v11',
                b2: 'v2'
            },
            f2:{
                b1: 'v3',
                b2: 'v44'
            }
        };
        let patchTarget = {
            f1: {
                b1: 'v11'
            },
            f2: {
                b2: 'v44'
            }
        };

        var patch = diffTools.diff(newDoc, oldDoc);
        assert.deepEqual( patch, patchTarget);
    });

    /**
     *
     */
    it('Value added', function () {
        let oldDoc = {
            f1:{
                b1: 'v1',
                b2: 'v2'
            }
        };

        let newDoc = {
            f1:{
                b1: 'v1',
                b2: 'v2',
                b3: 'v3'
            }
        };

        let patchTarget = {
            f1: {
                b3: 'v3'
            }
        };

        var patch = diffTools.diff(newDoc, oldDoc);
        assert.deepEqual( patch, patchTarget);
    });

    /**
     *
     */
    it('Value removed (temp)', function () {
        let oldDoc = {
            f1:{
                b1: 'v1',
                b2: 'v2'
            }
        };

        let newDoc = {
            f1:{
                b1: 'v1',
            }
        };

        let patchTarget = { };

        var patch = diffTools.diff(newDoc, oldDoc);
        assert.deepEqual( patch, patchTarget);

    });

    /**
     *
     */
    it('Deep modification', function () {
        let oldDoc = {
            f1:{
                f2:{
                    f3:{
                        f4:{
                            f5: 'v1',
                            f5_1: 'v2'
                        },
                        f4_1:{
                            aa: 'bb'
                        }
                    }
                }
            }
        };

        let newDoc = {
            f1:{
                f2:{
                    f3:{
                        f4:{
                            f5: 'v1',
                            f5_1: 'v22',
                            f5_2: 'v33'
                        },
                        f4_1:{
                            aa: 'bb'
                        }
                    }
                }
            }
        };

        let patchTarget = {
            f1:{
                f2:{
                    f3:{
                        f4:{
                            f5_1: 'v22',
                            f5_2: 'v33'
                        }
                    }
                }
            }
        };

        var patch = diffTools.diff(newDoc, oldDoc);
        assert.deepEqual( patch, patchTarget);

    });



    /**
     *
     */
    it('Array of simple types', function () {
        let oldDoc = {
            f1:{
                b1: ['v1'],
                b2: ['v2', 'v3'],
                b3: ['v4', 'v5'],
                b4: ['v6', 'v7']
            }
        };

        let newDoc = {
            f1:{
                b1: ['v1'],                 // same
                b2: ['v22', 'v3'],          // modified item
                b3: ['v4', 'v5', 'v6'],     // add item
                b4: ['v7', 'v6']            // wrong order
            }
        };

        let patchTarget = {
            f1: {
                b2: ['v22', 'v3'],          // modified item
                b3: ['v4', 'v5', 'v6']      // add item
            }
        };

        var patch = diffTools.diff(newDoc, oldDoc);
        assert.deepEqual( patch, patchTarget);

    });

    /**
     *
     */
    it('Array of complex types (TODO)', function () {
        let oldDoc = {
            f1:[
                {b1: 'v1'}
            ],
            f2:[
                {b2: 'v2'}
            ]
        };

        let newDoc = {
            f1:[
                {b1: 'v1'}   // same
            ],
            f2:[
                {b2: 'v22'}  // different
            ]
        };

        let patchTarget = {
            f1:[
                {b1: 'v1'}   // TODO:
            ],
            f2:[
                {b2: 'v22'}
            ]
        };

        var patch = diffTools.diff(newDoc, oldDoc);
        assert.deepEqual( patch, patchTarget);

    });


});



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 *
 */
describe('Compare arrays tools [UNIT]', function () {

    /**
     *
     */
    it('Check compareArray', function () {
        let a1 = [1,2,3];
        let a2 = [1,2,4];
        let a3 = [1,2,3,4]; // more elements than it was
        let a4 = [3,2,1];   // wrong order
        let a5 = [3,2,2,1]; // different length, same elements

        assert.equalArray(a1, a1);
        assert.notEqualArray(a1, a2);
        assert.notEqualArray(a1, a3);
        assert.equalArray(a1, a4);
        assert.notEqualArray(a1, a5);
    });


});


// return true if it has same elements. order not mind!
function compareArray(a, b){
    return _.difference(a, b).length === 0 && a.length === b.length;
}


